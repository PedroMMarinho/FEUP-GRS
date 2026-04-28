import os
import re
import shutil
from pathlib import Path
from typing import Any

TEMPLATES_DIR = Path(__file__).parent / "templates"
OUTPUT_DIR = Path(__file__).parent / "output"

# Files in a template that should have placeholders rendered
RENDERABLE_EXTENSIONS = {".sh", ".conf", ".env", ".txt", ".yml", ".yaml"}


def _render(text: str, config: dict[str, Any]) -> str:
    """Replace {{key}} and strip {{#flag}}...{{/flag}} blocks based on config booleans."""
    # Handle conditional blocks {{#key}}...{{/key}}
    def replace_block(match):
        key = match.group(1)
        content = match.group(2)
        value = config.get(key, False)
        if isinstance(value, str):
            value = value.lower() not in ("false", "0", "")
        return content if value else ""

    text = re.sub(r"\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}", replace_block, text, flags=re.DOTALL)

    # Replace {{key}} tokens
    for key, value in config.items():
        text = text.replace("{{" + key + "}}", str(value) if value is not None else "")

    return text


def _build_device_context(device: dict, output_dir: Path) -> Path:
    """Copy template for device type, render all files, return context path."""
    device_id = device["id"]
    device_type = device["type"]
    config = device.get("config", {})

    template_path = TEMPLATES_DIR / device_type
    if not template_path.exists():
        raise ValueError(f"No template found for device type '{device_type}'")

    context_path = output_dir / device_id
    if context_path.exists():
        shutil.rmtree(context_path)
    shutil.copytree(template_path, context_path)

    for file in context_path.iterdir():
        if file.suffix in RENDERABLE_EXTENSIONS:
            rendered = _render(file.read_text(), config)
            file.write_text(rendered)

    return context_path


def _network_to_compose_entry(network: dict) -> dict:
    """Turn a network definition into a docker-compose networks entry."""
    cfg = network.get("config", {})
    entry: dict = {"driver": "bridge"}

    ipam_config: dict = {}
    if cfg.get("subnet") and cfg.get("mask"):
        ipam_config["subnet"] = f"{cfg['subnet']}/{cfg['mask']}"
    if cfg.get("gateway"):
        ipam_config["gateway"] = cfg["gateway"]

    if ipam_config:
        entry["ipam"] = {"driver": "default", "config": [ipam_config]}

    return entry


def _device_to_compose_service(device: dict, networks: list[dict]) -> dict:
    """Turn a device into a docker-compose service entry."""
    device_id = device["id"]
    device_type = device["type"]
    config = device.get("config", {})
    device_network = device.get("network")

    service: dict = {
        "build": {"context": f"./{device_id}"},
        "container_name": device_id,
        "hostname": config.get("hostname", device_id),
        "cap_add": ["NET_ADMIN", "SYS_ADMIN"],
        "restart": "unless-stopped",
    }

    if device_type == "router":
        service["privileged"] = True
        service["sysctls"] = {"net.ipv4.ip_forward": 1}

    # Attach to the right network(s)
    if device_network:
        network_cfg = next((n for n in networks if n["id"] == device_network), None)
        network_entry: dict = {}
        if network_cfg and config.get("ip_address"):
            network_entry["ipv4_address"] = config["ip_address"]
        service["networks"] = {device_network: network_entry if network_entry else None}
    else:
        # Device with no network (e.g. core router) — attach to all networks
        all_nets = {n["id"]: None for n in networks}
        if all_nets:
            service["networks"] = all_nets

    return service


def generate(topology: dict) -> str:
    """
    Main entry point.
    Accepts the topology JSON, renders all device contexts, and returns
    the docker-compose.yml content as a string.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    devices: list[dict] = topology.get("devices", [])
    networks: list[dict] = topology.get("networks", [])

    services = {}
    for device in devices:
        _build_device_context(device, OUTPUT_DIR)
        services[device["id"]] = _device_to_compose_service(device, networks)

    compose_networks = {n["id"]: _network_to_compose_entry(n) for n in networks}

    compose = _build_yaml(services, compose_networks)

    output_file = OUTPUT_DIR / "docker-compose.yml"
    output_file.write_text(compose)

    return compose


def _build_yaml(services: dict, networks: dict) -> str:
    """Minimal YAML serialiser — avoids a PyYAML dependency for simple structures."""
    lines = ["services:"]
    for svc_name, svc in services.items():
        lines.append(f"  {svc_name}:")
        _dict_to_yaml(svc, lines, indent=4)

    if networks:
        lines.append("")
        lines.append("networks:")
        for net_name, net in networks.items():
            lines.append(f"  {net_name}:")
            _dict_to_yaml(net, lines, indent=4)

    return "\n".join(lines) + "\n"


def _dict_to_yaml(obj: Any, lines: list, indent: int) -> None:
    pad = " " * indent
    if isinstance(obj, dict):
        for k, v in obj.items():
            if v is None:
                lines.append(f"{pad}{k}: {{}}")
            elif isinstance(v, (dict, list)):
                lines.append(f"{pad}{k}:")
                _dict_to_yaml(v, lines, indent + 2)
            elif isinstance(v, bool):
                lines.append(f"{pad}{k}: {'true' if v else 'false'}")
            else:
                lines.append(f"{pad}{k}: {v}")
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, dict):
                first = True
                for k, v in item.items():
                    prefix = f"{pad}- " if first else f"{pad}  "
                    first = False
                    if isinstance(v, (dict, list)):
                        lines.append(f"{prefix}{k}:")
                        _dict_to_yaml(v, lines, indent + 4)
                    else:
                        lines.append(f"{prefix}{k}: {v}")
            else:
                lines.append(f"{pad}- {item}")