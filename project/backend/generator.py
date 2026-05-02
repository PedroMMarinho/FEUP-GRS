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


def _build_device_context(device: dict, output_dir: Path, networks: list[dict] = None) -> Path:
    """Copy template for device type, render all files, return context path."""
    device_id = device["id"]
    device_type = device["type"]
    config = dict(device.get("config", {}))

    # For routers, build ip_address and interfaces from the exported interfaces map
    if device_type == "router" and networks:
        iface_map = config.get("interfaces") or {}
        if iface_map and isinstance(iface_map, dict):
            ips   = [v["ip"]             for v in iface_map.values() if isinstance(v, dict) and v.get("ip")]
            masks = [v.get("mask", "24") for v in iface_map.values() if isinstance(v, dict) and v.get("ip")]
            subnets = [v.get("subnet")   for v in iface_map.values() if isinstance(v, dict) and v.get("ip")]
            config.setdefault("ip_address", ips[0] if ips else "")

            iface_cmds = []
            for i, (ip, mask, subnet) in enumerate(zip(ips, masks, subnets)):
                iface_cmds.append(f"ip addr add {ip}/{mask} dev eth{i} 2>/dev/null || true")
                iface_cmds.append(f"ip link set eth{i} up")
                if subnet:
                    iface_cmds.append(f"ip route add {subnet}/{mask} dev eth{i} 2>/dev/null || true")

            config["interfaces"] = "\n".join(iface_cmds)
        else:
            raw_nets = device.get("networks") or ([device["network"]] if device.get("network") else [])
            iface_cmds = []
            for i, net_id in enumerate(raw_nets):
                net = next((n for n in networks if n["id"] == net_id), None)
                if not net:
                    continue
                cfg = net.get("config", {})
                ip, mask, subnet = cfg.get("gateway"), cfg.get("mask", "24"), cfg.get("subnet")
                if ip:
                    iface_cmds.append(f"ip addr add {ip}/{mask} dev eth{i} 2>/dev/null || true")
                    iface_cmds.append(f"ip link set eth{i} up")
                    if subnet:
                        iface_cmds.append(f"ip route add {subnet}/{mask} dev eth{i} 2>/dev/null || true")
            if iface_cmds:
                first_ip = next((n.get("config", {}).get("gateway") for n in
                                 [next((n for n in networks if n["id"] == rid), None)
                                  for rid in raw_nets] if n), None)
                config.setdefault("ip_address", first_ip or "")
                config["interfaces"] = "\n".join(iface_cmds)

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

    # Support both old single `network` string and new `networks` array
    raw = device.get("networks") or ([device["network"]] if device.get("network") else [])
    device_network_ids: list[str] = [n for n in raw if n]

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

    if device_network_ids:
        service["networks"] = {}
        for net_id in device_network_ids:
            net = next((n for n in networks if n["id"] == net_id), None)
            net_cfg = net.get("config", {}) if net else {}
            entry: dict = {}
            # Routers get no static IP in compose — Docker owns the gateway IP on the bridge.
            # The actual routing IPs are configured inside the container via init.sh.
            if device_type == "router":
                pass
            elif config.get("ip_address"):
                entry["ipv4_address"] = config["ip_address"]
            service["networks"][net_id] = entry if entry else None
    
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
        _build_device_context(device, OUTPUT_DIR, networks)
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

if __name__ == "__main__":
    # Python program to demonstrate
    # Conversion of JSON data to
    # dictionary

    # importing the module
    import json

    # Opening JSON file
    with open('/Users/joselopes/Desktop/vno-topology-1777735735371.json') as json_file:
        data = json.load(json_file)

        generate(data)