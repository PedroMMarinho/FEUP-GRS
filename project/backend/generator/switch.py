from pathlib import Path
from .utils import copy_and_render_template


def build_context(
    device: dict,
    templates_dir: Path,
    output_dir: Path,
    derived_networks: list[dict],
) -> Path:
    config = dict(device.get("config", {}))

    # Ensure vlan_id exists — template handles the default-to-1 logic in shell
    config.setdefault("vlan_id", "")

    context_path = output_dir / device["id"]
    copy_and_render_template(templates_dir / "switch", context_path, config)
    return context_path


def to_compose_service(device: dict, derived_networks: list[dict]) -> dict:
    device_id = device["id"]
    config = device.get("config", {})

    service: dict = {
        "build": {"context": f"./{device_id}"},
        "container_name": device_id,
        "hostname": config.get("hostname", device_id),
        "cap_add": ["NET_ADMIN", "SYS_ADMIN"],
        "restart": "unless-stopped",
    }

    member_of = [n for n in derived_networks if device_id in n["members"]]
    if member_of:
        service["networks"] = {}
        for net in member_of:
            # Switches are L2 only — no static IP assigned on the Docker side
            service["networks"][net["id"]] = None

    return service