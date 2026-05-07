from pathlib import Path
from .utils import dotted_mask_to_cidr, copy_and_render_template


def build_context(
    device: dict,
    templates_dir: Path,
    output_dir: Path,
    derived_networks: list[dict],
) -> Path:
    config = dict(device.get("config", {}))

    # Convert dotted subnet mask to CIDR for use in `ip addr add`
    if "subnet_mask" in config:
        config["subnet_mask"] = dotted_mask_to_cidr(config["subnet_mask"])

    context_path = output_dir / device["id"]
    copy_and_render_template(templates_dir / "host", context_path, config)
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
            entry: dict = {}
            if config.get("ip_address"):
                entry["ipv4_address"] = config["ip_address"]
            service["networks"][net["id"]] = entry if entry else None

    return service