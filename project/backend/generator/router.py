from pathlib import Path
from .utils import copy_and_render_template


def _build_interface_commands(device: dict, derived_networks: list[dict]) -> str:
    """
    Generate the shell commands for the router's {{interfaces}} block.

    Interface ordering must match Docker's eth ordering, which is determined
    by the order networks appear in the compose `networks:` map for this service.
    We replicate that order here by iterating derived_networks that the router
    belongs to — same order used in to_compose_service().
    """
    iface_map: dict = device.get("config", {}).get("interfaces", {}) or {}
    if not isinstance(iface_map, dict):
        return ""

    # neighbor_id → interface config (from the JSON keys in config.interfaces)
    iface_by_neighbor: dict[str, dict] = {
        k: v for k, v in iface_map.items() if isinstance(v, dict)
    }

    router_id = device["id"]
    cmds: list[str] = []
    eth_index = 0

    for net in derived_networks:
        if router_id not in net["members"]:
            continue

        # Find the first neighbor in this network that has an interface config entry
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
            ip     = matched_cfg.get("ip", "")
            mask   = matched_cfg.get("mask", "24")
            subnet = matched_cfg.get("subnet", "")
            cmds.append(f"# --- {iface}: network {net['id']} ---")
            cmds.append(f"ip addr flush dev {iface} 2>/dev/null || true")
            cmds.append(f"ip addr add {ip}/{mask} dev {iface} 2>/dev/null || true")
            cmds.append(f"ip link set {iface} up")
            if subnet:
                cmds.append(f"ip route add {subnet}/{mask} dev {iface} 2>/dev/null || true")
            cmds.append(f'echo "[router] {iface}: {ip}/{mask} (subnet {subnet}/{mask})"')
        else:
            cmds.append(f"# --- {iface}: network {net['id']} (no explicit IP config) ---")
            cmds.append(f"ip link set {iface} up")

        cmds.append("")

    return "\n".join(cmds)


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


def build_context(
    device: dict,
    templates_dir: Path,
    output_dir: Path,
    derived_networks: list[dict],
) -> Path:
    config = dict(device.get("config", {}))

    # Replace the interfaces dict with rendered shell commands
    config["interfaces"] = _build_interface_commands(device, derived_networks)

    # enable_nat defaults to True — set "enable_nat": false in JSON to disable
    config.setdefault("enable_nat", True)

    context_path = output_dir / device["id"]
    copy_and_render_template(templates_dir / "router", context_path, config)
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
        "privileged": True,
        "sysctls": {"net.ipv4.ip_forward": "1"},
    }

    member_of = [n for n in derived_networks if device_id in n["members"]]
    if member_of:
        service["networks"] = {}
        for net in member_of:
            # Routers set their own IPs inside init.sh — no static IP here
            service["networks"][net["id"]] = None

    # Start after all directly connected non-router neighbours are up
    neighbors = _router_neighbors(device_id, derived_networks)
    if neighbors:
        service["depends_on"] = neighbors

    return service