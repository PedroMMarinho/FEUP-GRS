from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, FileResponse
from pydantic import BaseModel
from pathlib import Path
from typing import Any
import zipfile
import io

from generator import generate, OUTPUT_DIR

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
    networks: list[dict[str, Any]] = []
    devices: list[dict[str, Any]] = []
    links: list[dict[str, Any]] = []


@app.post("/generate", response_class=PlainTextResponse)
def generate_compose(topology: Topology):
    try:
        compose = generate(topology.model_dump())
        return compose
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate/download")
def generate_and_download(topology: Topology):
    """Generate and return a zip with docker-compose.yml + all device contexts."""
    try:
        generate(topology.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in OUTPUT_DIR.rglob("*"):
            if path.is_file():
                zf.write(path, path.relative_to(OUTPUT_DIR.parent))
    buf.seek(0)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=network.zip"},
    )


@app.get("/templates")
def list_templates():
    """Return available device types (template folder names)."""
    from generator import TEMPLATES_DIR
    types = [d.name for d in TEMPLATES_DIR.iterdir() if d.is_dir()]
    return {"types": types}


@app.get("/health")
def health():
    return {"status": "ok"}
