from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Any
import zipfile
import io
import subprocess

from backend.generator import generate, OUTPUT_DIR

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


# In-memory state for the last generated topology.
# This is fine for an MVP, but not ideal for multiple users/sessions.
LAST_TOPOLOGY: dict[str, Any] | None = None
LAST_DEVICE_NAME_MAP: dict[str, str] = {}
LAST_DEVICE_IP_MAP: dict[str, str] = {}


def _container_name_for_device(device: dict[str, Any]) -> str:
    """
    Must match devices/common.py base_service().
    You changed container_name to hostname if present, otherwise device id.
    """
    config = device.get("config") or {}
    return config.get("hostname") or device["id"]


def _save_runtime_state(topology: dict[str, Any]) -> None:
    global LAST_TOPOLOGY, LAST_DEVICE_NAME_MAP, LAST_DEVICE_IP_MAP

    LAST_TOPOLOGY = topology
    LAST_DEVICE_NAME_MAP = {}
    LAST_DEVICE_IP_MAP = {}

    for device in topology.get("devices", []):
        device_id = device.get("id")
        if not device_id:
            continue

        config = device.get("config") or {}
        container_name = _container_name_for_device(device)

        LAST_DEVICE_NAME_MAP[device_id] = container_name
        LAST_DEVICE_NAME_MAP[container_name] = container_name

        ip = config.get("ip_address")

        # For routers, there is no single top-level IP, so take nothing here.
        # For hosts, ip_address is what we want.
        if ip:
            LAST_DEVICE_IP_MAP[device_id] = ip
            LAST_DEVICE_IP_MAP[container_name] = ip


def _run_command(
    command: list[str],
    cwd: str | None = None,
    timeout: int = 60,
) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            cwd=cwd,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail=f"Command timed out: {' '.join(command)}",
        ) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Command not found: {command[0]}",
        ) from exc


def _run_generate(topology: Topology) -> str:
    """Shared generate logic — raises HTTPException on failure."""
    try:
        topology_dict = topology.model_dump()
        compose_text = generate(topology_dict)
        _save_runtime_state(topology_dict)
        return compose_text
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


def _docker_compose_command() -> list[str]:
    """
    Uses modern Docker Compose plugin.
    If your machine only has docker-compose, change this to:
        return ["docker-compose"]
    """
    return ["docker", "compose"]


@app.post("/run")
def run_topology(topology: Topology):
    """
    Generate docker-compose.yml and start the topology.

    Response:
    {
      "status": "ok",
      "message": "...",
      "compose_path": "...",
      "stdout": "...",
      "stderr": "..."
    }
    """
    _run_generate(topology)

    cmd = _docker_compose_command() + ["up", "-d", "--build"]
    result = _run_command(
        cmd,
        cwd=str(OUTPUT_DIR),
        timeout=180,
    )

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "docker compose up failed",
                "stdout": result.stdout,
                "stderr": result.stderr,
            },
        )

    return {
        "status": "ok",
        "message": "Topology generated and started",
        "compose_path": str(OUTPUT_DIR / "docker-compose.yml"),
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


@app.get("/ping/host", response_class=PlainTextResponse)
def ping_host(
    host1: str = Query(..., description="Source device id or container name"),
    host2: str = Query(..., description="Destination device id, container name, hostname, or IP"),
):
    """
    Run ping from host1 to host2.

    Example:
      /ping/host?host1=host_cpmgz&host2=host_t3osk
      /ping/host?host1=host-02&host2=host-03
      /ping/host?host1=host-02&host2=10.0.3.3
    """
    source_container = LAST_DEVICE_NAME_MAP.get(host1, host1)
    destination = LAST_DEVICE_IP_MAP.get(host2, host2)

    cmd = [
        "docker",
        "exec",
        source_container,
        "ping",
        "-c",
        "4",
        destination,
    ]

    result = _run_command(cmd, timeout=30)

    output = ""
    if result.stdout:
        output += result.stdout
    if result.stderr:
        output += "\n--- stderr ---\n"
        output += result.stderr

    if result.returncode != 0:
        # Return the ping output instead of hiding it.
        raise HTTPException(
            status_code=500,
            detail=output,
        )

    return output

@app.get("/command", response_class=PlainTextResponse)
def run_command_on_host(
    host: str = Query(..., description="Device id, hostname, or container name"),
    command: str = Query(..., description="Command to run inside the container"),
):
    """
    Run an arbitrary command inside a generated container.

    Example:
      /command?host=host-03&command=ip route show
      /command?host=router-01&command=ip addr
      /command?host=host_cpmgz&command=ping -c 4 10.0.3.3
    """
    container = LAST_DEVICE_NAME_MAP.get(host, host)

    # Use sh -lc so commands with spaces, pipes, redirects, etc. work.
    cmd = [
        "docker",
        "exec",
        container,
        "sh",
        "-lc",
        command,
    ]

    result = _run_command(cmd, timeout=30)

    output = ""
    if result.stdout:
        output += result.stdout
    if result.stderr:
        output += "\n--- stderr ---\n"
        output += result.stderr

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=output or f"Command failed with exit code {result.returncode}",
        )

    return output or ""


@app.post("/stop")
def stop_topology():
    """
    Stop the currently generated topology.
    """
    cmd = _docker_compose_command() + ["down", "--remove-orphans"]
    result = _run_command(
        cmd,
        cwd=str(OUTPUT_DIR),
        timeout=120,
    )

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "docker compose down failed",
                "stdout": result.stdout,
                "stderr": result.stderr,
            },
        )

    return {
        "status": "ok",
        "message": "Topology stopped",
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
