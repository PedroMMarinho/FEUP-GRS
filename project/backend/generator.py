import re
import shutil
from pathlib import Path
from typing import Any
from collections import defaultdict

TEMPLATES_DIR = Path(__file__).parent / "templates"
OUTPUT_DIR = Path(__file__).parent / "output"

RENDERABLE_EXTENSIONS = {".sh", ".conf", ".env", ".txt", ".yml", ".yaml"}


def _render(text: str, config: dict[str, Any]) -> str:
    def replace_block(match):
        key = match.group(1)
        content = match.group(2)
        value = config.get(key, False)
        if isinstance(value, str):
            value = value.lower() not in ("false", "0", "")
        return content if value else ""

    text = re.sub(r"\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}", replace_block, text, flags=re.DOTALL)
    for key, value in config.items():
        text = text.replace("{{" + key + "}}", str(value) if value is not None else "")
    return text


def _derive_networks(devices: list[dict], links: list[dict]) -> list[dict]:
    """
    Derive Docker networks purely from the link graph.
    Each connected component (group of devices reachable through switches/hosts)
    becomes one Docker bridge network.
    Routers are boundaries — they connect components but don't merge them.
    """
    device_map = {d["id"]: d for d in devices}

    # Build adjacency — exclude routers as bridge nodes (they sit between networks)
    adj = defaultdict(set)
    for link in links:
        src, tgt = link["source"], link["target"]
        src_type = device_map.get(src, {}).get("type")
        tgt_type = device_map.get(tgt, {}).get("type")

        # Only propagate connectivity through non-router nodes
        if src_type != "router" and tgt_type != "router":
            adj[src].add(tgt)
            adj[tgt].add(src)

    # Union-Find to group connected non-router devices
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(a, b):
        parent[find(a)] = find(b)

    non_router_ids = [d["id"] for d in devices if d.get("type") != "router"]
    for dev_id in non_router_ids:
        find(dev_id)
    for dev_id, neighbors in adj.items():
        for nb in neighbors:
            union(dev_id, nb)

    # Group by component root
    components = defaultdict(list)
    for dev_id in non_router_ids:
        components[find(dev_id)].append(dev_id)

    # Build network definitions — one per component
    derived = []
    for i, (root, members) in enumerate(components.items()):
        net_id = f"net_{i}"

        # Try to get subnet info from any member's config or the first host found
        subnet, mask, gateway = None, "24", None
        for member_id in members:
            dev = device_map[member_id]
            cfg = dev.get("config", {})
            if cfg.get("gateway"):
                gateway = cfg["gateway"]
            if cfg.get("subnet_mask"):
                # Convert dotted mask to CIDR if needed
                sm = cfg["subnet_mask"]
                if "." in sm:
                    mask = str(sum(bin(int(x)).count("1") for x in sm.split(".")))
                else:
                    mask = sm
            if cfg.get("ip_address") and not subnet:
                # Derive subnet from first host IP + mask
                ip_parts = cfg["ip_address"].split(".")
                m = int(mask)
                locked = m // 8
                subnet = ".".join(ip_parts[:locked]) + "." + ".".join(["0"] * (4 - locked))

        derived.append({
            "id": net_id,
            "members": members,
            "config": {
                "subnet": subnet,
                "mask": mask,
                "gateway": gateway,
            },
            "_roots": {find(m) for m in members},
            "_component_root": root,
        })

    # Attach routers to the networks they border
    for dev in devices:
        if dev.get("type") != "router":
            continue
        router_id = dev["id"]
        for link in links:
            src, tgt = link["source"], link["target"]
            neighbor_id = tgt if src == router_id else (src if tgt == router_id else None)
            if not neighbor_id:
                continue
            neighbor_type = device_map.get(neighbor_id, {}).get("type")
            if neighbor_type == "router":
                continue
            neighbor_root = find(neighbor_id)
            for net in derived:
                if net["_component_root"] == neighbor_root:
                    if router_id not in net["members"]:
                        net["members"].append(router_id)

    return derived


def _build_device_context(device: dict, output_dir: Path, derived_networks: list[dict]) -> Path:
    device_id = device["id"]
    device_type = device["type"]
    config = dict(device.get("config", {}))

    if device_type == "router":
        iface_map = config.get("interfaces") or {}
        if iface_map and isinstance(iface_map, dict):
            ips     = [v["ip"]             for v in iface_map.values() if isinstance(v, dict) and v.get("ip")]
            masks   = [v.get("mask", "24") for v in iface_map.values() if isinstance(v, dict) and v.get("ip")]
            subnets = [v.get("subnet")     for v in iface_map.values() if isinstance(v, dict) and v.get("ip")]
            config.setdefault("ip_address", ips[0] if ips else "")

            iface_cmds = []
            for i, (ip, mask, subnet) in enumerate(zip(ips, masks, subnets)):
                iface_cmds.append(f"ip addr add {ip}/{mask} dev eth{i} 2>/dev/null || true")
                iface_cmds.append(f"ip link set eth{i} up")
                if subnet:
                    iface_cmds.append(f"ip route add {subnet}/{mask} dev eth{i} 2>/dev/null || true")
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


def _device_to_compose_service(device: dict, derived_networks: list[dict]) -> dict:
    device_id = device["id"]
    device_type = device["type"]
    config = device.get("config", {})

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

    # Find which derived networks this device belongs to
    member_of = [n for n in derived_networks if device_id in n["members"]]

    if member_of:
        service["networks"] = {}
        for net in member_of:
            entry: dict = {}
            # Routers get no static IP — configured inside container via init.sh
            if device_type != "router" and config.get("ip_address"):
                entry["ipv4_address"] = config["ip_address"]
            service["networks"][net["id"]] = entry if entry else None

    return service


def _network_to_compose_entry(net: dict) -> dict:
    cfg = net.get("config", {})
    entry: dict = {"driver": "bridge"}

    ipam_config: dict = {}
    if cfg.get("subnet") and cfg.get("mask"):
        ipam_config["subnet"] = f"{cfg['subnet']}/{cfg['mask']}"
    if cfg.get("gateway"):
        ipam_config["gateway"] = cfg["gateway"]

    if ipam_config:
        entry["ipam"] = {"driver": "default", "config": [ipam_config]}

    return entry


def generate(topology: dict) -> str:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    devices: list[dict] = topology.get("devices", [])
    links:   list[dict] = topology.get("links", [])

    # Derive Docker networks from link graph — ignore NetworkNode declarations
    derived_networks = _derive_networks(devices, links)

    services = {}
    for device in devices:
        _build_device_context(device, OUTPUT_DIR, derived_networks)
        services[device["id"]] = _device_to_compose_service(device, derived_networks)

    compose_networks = {n["id"]: _network_to_compose_entry(n) for n in derived_networks}

    compose = _build_yaml(services, compose_networks)

    output_file = OUTPUT_DIR / "docker-compose.yml"
    output_file.write_text(compose)

    return compose


def _build_yaml(services: dict, networks: dict) -> str:
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
    with open('/Users/joselopes/Desktop/vno-topology-1777741311532.json') as json_file:
        data = json.load(json_file)

        generate(data)