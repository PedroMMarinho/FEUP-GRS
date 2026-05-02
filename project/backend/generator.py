import re
import shutil
from pathlib import Path
from typing import Any
from collections import defaultdict
 
TEMPLATES_DIR = Path(__file__).parent / "templates"
OUTPUT_DIR = Path(__file__).parent / "output"
 
RENDERABLE_EXTENSIONS = {".sh", ".conf", ".env", ".txt", ".yml", ".yaml"}
 
 
# ---------------------------------------------------------------------------
# Template rendering
# ---------------------------------------------------------------------------
 
def _render(text: str, config: dict[str, Any]) -> str:
    """
    Render a template string with the given config dict.
 
    Supports:
      {{key}}              → simple substitution
      {{#flag}}...{{/flag}} → conditional block (truthy if non-empty / non-false)
    """
    def replace_block(match):
        key = match.group(1)
        content = match.group(2)
        value = config.get(key, False)
        if isinstance(value, str):
            value = value.strip().lower() not in ("false", "0", "", "none")
        return content if value else ""
 
    text = re.sub(
        r"\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}",
        replace_block,
        text,
        flags=re.DOTALL,
    )
 
    for key, value in config.items():
        text = text.replace("{{" + key + "}}", str(value) if value is not None else "")
 
    return text
 
 
# ---------------------------------------------------------------------------
# Network derivation (Union-Find over link graph)
# ---------------------------------------------------------------------------
 
def _dotted_mask_to_cidr(mask: str) -> str:
    """Convert '255.255.255.0' → '24'. Pass-through if already numeric."""
    if "." in str(mask):
        return str(sum(bin(int(x)).count("1") for x in mask.split(".")))
    return str(mask)
 
 
def _derive_networks(devices: list[dict], links: list[dict]) -> list[dict]:
    """
    Derive Docker bridge networks purely from the link graph.
 
    Rules:
      - Non-router devices reachable through switches/hosts form one component.
      - Routers are boundaries: they join derived networks as members but do
        NOT merge the components they sit between.
    """
    device_map = {d["id"]: d for d in devices}
 
    # Build adjacency excluding routers so they act as boundaries
    adj: dict[str, set] = defaultdict(set)
    for link in links:
        src, tgt = link["source"], link["target"]
        src_type = device_map.get(src, {}).get("type")
        tgt_type = device_map.get(tgt, {}).get("type")
        if src_type != "router" and tgt_type != "router":
            adj[src].add(tgt)
            adj[tgt].add(src)
 
    # Union-Find
    parent: dict[str, str] = {}
 
    def find(x: str) -> str:
        parent.setdefault(x, x)
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]
 
    def union(a: str, b: str) -> None:
        parent[find(a)] = find(b)
 
    non_router_ids = [d["id"] for d in devices if d.get("type") != "router"]
    for dev_id in non_router_ids:
        find(dev_id)
    for dev_id, neighbors in adj.items():
        for nb in neighbors:
            union(dev_id, nb)
 
    # Group by component root
    components: dict[str, list[str]] = defaultdict(list)
    for dev_id in non_router_ids:
        components[find(dev_id)].append(dev_id)
 
    derived = []
    for i, (root, members) in enumerate(components.items()):
        net_id = f"net_{i}"
 
        # Infer subnet/mask from the first host that has IP info
        subnet, mask, gateway = None, "24", None
        for member_id in members:
            cfg = device_map[member_id].get("config", {})
            if cfg.get("gateway") and not gateway:
                gateway = cfg["gateway"]
            if cfg.get("subnet_mask"):
                mask = _dotted_mask_to_cidr(cfg["subnet_mask"])
            if cfg.get("ip_address") and not subnet:
                ip_parts = cfg["ip_address"].split(".")
                m = int(mask)
                locked = m // 8
                subnet = ".".join(ip_parts[:locked]) + "." + ".".join(["0"] * (4 - locked))
 
        derived.append({
            "id": net_id,
            "members": list(members),
            "config": {"subnet": subnet, "mask": mask, "gateway": gateway},
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
            if device_map.get(neighbor_id, {}).get("type") == "router":
                continue
            neighbor_root = find(neighbor_id)
            for net in derived:
                if net["_component_root"] == neighbor_root:
                    if router_id not in net["members"]:
                        net["members"].append(router_id)
 
    return derived
 
 
# ---------------------------------------------------------------------------
# Per-device context building
# ---------------------------------------------------------------------------
 
def _build_router_interface_commands(device: dict, derived_networks: list[dict]) -> str:
    """
    Generate the shell commands for a router's init.sh {{interfaces}} block.
 
    Interface ordering must match Docker's eth ordering, which is determined
    by the order networks appear in the compose `networks:` map for this service.
    We replicate that order here by iterating derived_networks that the router belongs to.
    """
    iface_map: dict = device.get("config", {}).get("interfaces", {}) or {}
    if not isinstance(iface_map, dict):
        return ""
 
    # Build a lookup: neighbor_id → interface config
    # The JSON keys in config.interfaces are the connected node IDs
    iface_by_neighbor: dict[str, dict] = {
        k: v for k, v in iface_map.items() if isinstance(v, dict)
    }
 
    router_id = device["id"]
    cmds: list[str] = []
    eth_index = 0
 
    for net in derived_networks:
        if router_id not in net["members"]:
            continue
 
        # Find which neighbor in this network's config matches an interface key
        matched_cfg: dict | None = None
        for neighbor_id in net["members"]:
            if neighbor_id == router_id:
                continue
            if neighbor_id in iface_by_neighbor:
                matched_cfg = iface_by_neighbor[neighbor_id]
                break
 
        iface = f"eth{eth_index}"
        eth_index += 1
 
        if matched_cfg:
            ip = matched_cfg.get("ip", "")
            mask = matched_cfg.get("mask", "24")
            subnet = matched_cfg.get("subnet", "")
            cmds.append(f"# --- {iface}: network {net['id']} ---")
            cmds.append(f"ip addr flush dev {iface} 2>/dev/null || true")
            cmds.append(f"ip addr add {ip}/{mask} dev {iface} 2>/dev/null || true")
            cmds.append(f"ip link set {iface} up")
            if subnet:
                cmds.append(f"ip route add {subnet}/{mask} dev {iface} 2>/dev/null || true")
            cmds.append(f"echo \"[router] {iface}: {ip}/{mask} (subnet {subnet}/{mask})\"")
        else:
            # No explicit config for this network interface — bring it up anyway
            cmds.append(f"# --- {iface}: network {net['id']} (no explicit IP config) ---")
            cmds.append(f"ip link set {iface} up")
 
        cmds.append("")
 
    return "\n".join(cmds)
 
 
def _build_device_context(
    device: dict,
    output_dir: Path,
    derived_networks: list[dict],
) -> Path:
    """
    Copy the template for this device type into output_dir/<device_id>/
    and render all renderable files with the device's config.
    """
    device_id = device["id"]
    device_type = device["type"]
    config = dict(device.get("config", {}))
 
    # ---- Normalise config per device type ----
    if device_type == "host":
        # CIDR mask for ip addr add in init.sh
        if "subnet_mask" in config:
            config["subnet_mask"] = _dotted_mask_to_cidr(config["subnet_mask"])
 
    elif device_type == "switch":
        # Ensure vlan_id exists (may be empty string — template handles default)
        config.setdefault("vlan_id", "")
 
    elif device_type == "router":
        # Replace the interfaces dict with rendered shell commands
        config["interfaces"] = _build_router_interface_commands(device, derived_networks)
        # enable_nat defaults to True for routers — can be overridden in JSON
        config.setdefault("enable_nat", True)
 
    # ---- Copy template and render files ----
    template_path = TEMPLATES_DIR / device_type
    if not template_path.exists():
        raise ValueError(f"No template found for device type '{device_type}'")
 
    context_path = output_dir / device_id
    if context_path.exists():
        shutil.rmtree(context_path)
    shutil.copytree(template_path, context_path)
 
    for file in context_path.rglob("*"):
        if file.is_file() and file.suffix in RENDERABLE_EXTENSIONS:
            rendered = _render(file.read_text(), config)
            file.write_text(rendered)
 
    return context_path
 
 
# ---------------------------------------------------------------------------
# Docker Compose service + network builders
# ---------------------------------------------------------------------------
 
def _device_to_compose_service(
    device: dict,
    derived_networks: list[dict],
) -> dict:
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
        service["sysctls"] = {"net.ipv4.ip_forward": "1"}
 
    # Networks this device belongs to
    member_of = [n for n in derived_networks if device_id in n["members"]]
 
    if member_of:
        service["networks"] = {}
        for net in member_of:
            entry: dict = {}
            # Hosts & switches get a static IP; routers configure their own IPs via init.sh
            if device_type == "host" and config.get("ip_address"):
                entry["ipv4_address"] = config["ip_address"]
            elif device_type == "switch":
                # Switches are L2 only — no IP needed on the Docker side
                pass
            # router → no static IP entry
            service["networks"][net["id"]] = entry if entry else None
 
    # Routers should start after their connected non-router neighbours
    if device_type == "router":
        neighbors = _router_neighbors(device_id, derived_networks)
        if neighbors:
            service["depends_on"] = neighbors
 
    return service
 
 
def _router_neighbors(router_id: str, derived_networks: list[dict]) -> list[str]:
    """Return all non-router device IDs that share a network with this router."""
    neighbors: list[str] = []
    for net in derived_networks:
        if router_id not in net["members"]:
            continue
        for member in net["members"]:
            if member != router_id and member not in neighbors:
                neighbors.append(member)
    return neighbors
 
 
def _network_to_compose_entry(net: dict) -> dict:
    """
    Build the Docker Compose network definition for a derived network.
 
    We do NOT set a gateway in IPAM because Docker would claim that IP
    on the bridge interface of the host machine, conflicting with the
    router container that actually owns the gateway IP.
    """
    cfg = net.get("config", {})
    entry: dict = {"driver": "bridge"}
 
    ipam_config: dict = {}
    if cfg.get("subnet") and cfg.get("mask"):
        ipam_config["subnet"] = f"{cfg['subnet']}/{cfg['mask']}"
 
    if ipam_config:
        entry["ipam"] = {"driver": "default", "config": [ipam_config]}
 
    return entry
 
 
# ---------------------------------------------------------------------------
# YAML serialiser
# ---------------------------------------------------------------------------
 
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
 
 
# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------
 
def generate(topology: dict) -> str:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
 
    devices: list[dict] = topology.get("devices", [])
    links: list[dict] = topology.get("links", [])
 
    # Derive Docker networks from the link graph — ignore NetworkNode declarations
    derived_networks = _derive_networks(devices, links)
 
    services: dict = {}
    for device in devices:
        _build_device_context(device, OUTPUT_DIR, derived_networks)
        services[device["id"]] = _device_to_compose_service(device, derived_networks)
 
    compose_networks = {n["id"]: _network_to_compose_entry(n) for n in derived_networks}
    compose = _build_yaml(services, compose_networks)
 
    output_file = OUTPUT_DIR / "docker-compose.yml"
    output_file.write_text(compose)
 
    return compose

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