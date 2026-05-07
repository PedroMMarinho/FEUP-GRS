from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, FileResponse
from pydantic import BaseModel
from pathlib import Path
from typing import Any
import zipfile
import io

from project.backend.generator import generate, OUTPUT_DIR

app = FastAPI(title="GRS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Topology(BaseModel):
    model_config = {"extra": "allow"}

    version: str = "1.0"
    timestamp: str | None = None
    networks: list[dict[str, Any]] = []
    devices: list[dict[str, Any]] = []
    links: list[dict[str, Any]] = []


def _run_generate(topology: Topology) -> str:
    """Shared generate logic — raises HTTPException on failure."""
    try:
        return generate(topology.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _build_zip() -> io.BytesIO:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in OUTPUT_DIR.rglob("*"):
            if path.is_file():
                zf.write(path, path.relative_to(OUTPUT_DIR.parent))
    buf.seek(0)
    return buf


@app.post("/generate", response_class=PlainTextResponse)
def generate_compose(topology: Topology):
    """Return docker-compose.yml as plain text."""
    return _run_generate(topology)


@app.post("/generate/download")
def generate_and_download(topology: Topology):
    """Generate and return a zip with docker-compose.yml + all device contexts."""
    from fastapi.responses import StreamingResponse
    _run_generate(topology)
    return StreamingResponse(
        _build_zip(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=network.zip"},
    )


@app.get("/templates")
def list_templates():
    """Return available device types (template folder names)."""
    from project.backend.generator import TEMPLATES_DIR
    types = [d.name for d in TEMPLATES_DIR.iterdir() if d.is_dir()]
    return {"types": types}


@app.get("/health")
def health():
    return {"status": "ok"}