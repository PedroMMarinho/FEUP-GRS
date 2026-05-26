from __future__ import annotations

import ipaddress
import shutil
from pathlib import Path
from typing import Any

import yaml

from backend.devices.host import build_host_service, render_host_context
from backend.devices.router import build_router_service, render_router_context
from backend.devices.switch import build_switch_service, render_switch_context
from backend.devices.server import build_server_service, render_server_context
from backend.devices.load_balancer import build_load_balancer_service, render_load_balancer_context
from backend.devices.dns_server import build_dns_server_service, render_dns_server_context

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
OUTPUT_DIR = BASE_DIR / "generated" / "network"
COMPOSE_FILE = OUTPUT_DIR / "docker-compose.yml"

SUPPORTED_TYPES = {"host", "switch", "router", "server", "load_balancer", "dns_server",}
TRANSIT_PREFIX = ipaddress.ip_network("10.255.0.0/16")
TRANSIT_MASK = 29


def generate(topology: dict[str, Any]) -> str:
    """
    Generate docker-compose.yml plus one build context per device.

    Output folder:
        project/backend/generated/network/
            docker-compose.yml
            host_xxxxx/
            router_xxxxx/
            switch_xxxxx/
    """
    normalized = normalize_and_validate(topology)

    reset_output_dir()

    compose: dict[str, Any] = {
        "services": {},
        "networks": build_compose_networks(normalized["networks_by_id"]),
    }

    for device in normalized["devices"]:
        device_type = device["type"]

        if device_type == "host":
            render_host_context(device)
            service = build_host_service(device, normalized)
        elif device_type == "switch":
            render_switch_context(device)
            service = build_switch_service(device, normalized)
        elif device_type == "router":
            render_router_context(device)
            service = build_router_service(device, normalized)
        elif device_type == "server":
            render_server_context(device)
            service = build_server_service(device, normalized)
        elif device_type == "load_balancer":
            render_load_balancer_context(device, normalized)
            service = build_load_balancer_service(device, normalized)
        elif device_type == "dns_server":
            render_dns_server_context(device)
            service = build_dns_server_service(device, normalized)
        else:
            raise ValueError(f"Unsupported device type: {device_type}")

        compose["services"][device["id"]] = service

    yaml_text = yaml.safe_dump(compose, sort_keys=False, default_flow_style=False)
    COMPOSE_FILE.write_text(yaml_text, encoding="utf-8")
    print(COMPOSE_FILE)
    return yaml_text


def reset_output_dir() -> None:
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def router_router_link_key(a: str, b: str) -> str:
    return "__".join(sorted([a, b]))


def transit_network_id_for(a: str, b: str) -> str:
    left, right = sorted([a, b])
    return f"transit_{left}_{right}"


def transit_network_id_from_subnet(subnet: str, mask: str) -> str:
    safe_subnet = subnet.replace(".", "_").replace(":", "_")
    return f"transit_{safe_subnet}_{mask}"


def add_transit_networks_for_router_links(
    networks_by_id: dict[str, dict[str, Any]],
    devices_by_id: dict[str, dict[str, Any]],
    links: list[dict[str, Any]],
) -> None:
    """
    Adds Docker networks for router-router links using the user-defined
    subnet/mask from the router interface configs.

    Each router-router link should have interface config on both routers.
    """
    seen_links: set[str] = set()

    for link in links:
        source_id = link.get("source")
        target_id = link.get("target")

        source = devices_by_id.get(source_id)
        target = devices_by_id.get(target_id)

        if not source or not target:
            continue

        if source.get("type") != "router" or target.get("type") != "router":
            continue

        key = router_router_link_key(source_id, target_id)
        if key in seen_links:
            continue

        seen_links.add(key)

        source_interfaces = (source.get("config") or {}).get("interfaces") or {}
        target_interfaces = (target.get("config") or {}).get("interfaces") or {}

        source_iface = source_interfaces.get(target_id)
        target_iface = target_interfaces.get(source_id)

        if not source_iface:
            raise ValueError(
                f"Router-router link {source_id} <-> {target_id} is missing "
                f"interface config on {source_id}"
            )

        if not target_iface:
            raise ValueError(
                f"Router-router link {source_id} <-> {target_id} is missing "
                f"interface config on {target_id}"
            )

        source_ip = source_iface.get("ip")
        target_ip = target_iface.get("ip")

        source_subnet = source_iface.get("subnet")
        source_mask = str(source_iface.get("mask", ""))

        target_subnet = target_iface.get("subnet")
        target_mask = str(target_iface.get("mask", ""))

        if not source_ip or not source_subnet or not source_mask:
            raise ValueError(
                f"Router {source_id} interface to {target_id} needs ip, subnet and mask"
            )

        if not target_ip or not target_subnet or not target_mask:
            raise ValueError(
                f"Router {target_id} interface to {source_id} needs ip, subnet and mask"
            )

        try:
            source_net = ipaddress.ip_network(
                f"{source_subnet}/{source_mask}",
                strict=False,
            )
            target_net = ipaddress.ip_network(
                f"{target_subnet}/{target_mask}",
                strict=False,
            )
            source_ip_obj = ipaddress.ip_address(source_ip)
            target_ip_obj = ipaddress.ip_address(target_ip)
        except ValueError as exc:
            raise ValueError(
                f"Invalid transit config for router-router link "
                f"{source_id} <-> {target_id}"
            ) from exc

        if source_net != target_net:
            raise ValueError(
                f"Router-router link {source_id} <-> {target_id} has mismatched "
                f"transit networks: {source_net} and {target_net}"
            )

        if source_ip_obj not in source_net:
            raise ValueError(
                f"Router {source_id} IP {source_ip} is not inside transit network {source_net}"
            )

        if target_ip_obj not in source_net:
            raise ValueError(
                f"Router {target_id} IP {target_ip} is not inside transit network {source_net}"
            )

        if source_ip_obj == target_ip_obj:
            raise ValueError(
                f"Router-router link {source_id} <-> {target_id} uses duplicate IP {source_ip}"
            )

        # Docker bridge normally reserves the first usable IP as the bridge gateway.
        first_usable = next(source_net.hosts(), None)
        if first_usable and (source_ip_obj == first_usable or target_ip_obj == first_usable):
            raise ValueError(
                f"Transit network {source_net} should not use {first_usable} for a router. "
                f"Docker usually reserves it as the bridge gateway."
            )

        network_id = transit_network_id_from_subnet(
            str(source_net.network_address),
            str(source_net.prefixlen),
        )

        if network_id not in networks_by_id:
            networks_by_id[network_id] = {
                "id": network_id,
                "config": {
                    "subnet": str(source_net.network_address),
                    "mask": str(source_net.prefixlen),
                },
                "members": [
                    source_id,
                    target_id,
                ],
                "generated": True,
                "type": "transit",
            }
        else:
            members = networks_by_id[network_id].setdefault("members", [])
            for router_id in [source_id, target_id]:
                if router_id not in members:
                    members.append(router_id)

def generate_router_static_routes(
    devices: list[dict[str, Any]],
    networks_by_id: dict[str, dict[str, Any]],
    devices_by_id: dict[str, dict[str, Any]],
) -> None:
    routers = [d for d in devices if d["type"] == "router"]
    routers_by_id = {r["id"]: r for r in routers}

    # router_id -> set of directly connected network ids
    router_networks: dict[str, set[str]] = {
        r["id"]: {a["network_id"] for a in r.get("_attachments", [])}
        for r in routers
    }

    # router graph: router -> neighbor router -> next-hop IP of neighbor
    adjacency: dict[str, dict[str, str]] = {r["id"]: {} for r in routers}

    for router in routers:
        router_id = router["id"]
        interfaces = (router.get("config") or {}).get("interfaces") or {}

        for peer_id, iface in interfaces.items():
            peer = devices_by_id.get(peer_id)
            if not peer or peer.get("type") != "router":
                continue

            peer_interfaces = (peer.get("config") or {}).get("interfaces") or {}
            reverse_iface = peer_interfaces.get(router_id)

            if not reverse_iface or not reverse_iface.get("ip"):
                raise ValueError(
                    f"Router link {router_id} <-> {peer_id} is missing reverse interface IP"
                )

            # From router_id, the next hop to peer_id is the peer's IP
            # on the shared transit network.
            adjacency[router_id][peer_id] = reverse_iface["ip"]

    for router in routers:
        router_id = router["id"]
        routes: list[dict[str, str]] = []

        # BFS over router graph.
        visited = {router_id}
        queue: list[tuple[str, str | None]] = [(router_id, None)]
        # tuple: current_router_id, first_hop_router_id

        while queue:
            current_id, first_hop = queue.pop(0)

            for neighbor_id in adjacency.get(current_id, {}):
                if neighbor_id in visited:
                    continue

                visited.add(neighbor_id)

                next_first_hop = first_hop or neighbor_id
                queue.append((neighbor_id, next_first_hop))

                # For every network connected to this newly reached router,
                # add a route if the original router is not directly connected to it.
                for network_id in router_networks.get(neighbor_id, set()):
                    if network_id in router_networks[router_id]:
                        continue

                    network = networks_by_id[network_id]

                    # Do not add routes to transit networks; only LAN networks.
                    if network.get("type") == "transit" or network.get("generated") is True:
                        continue

                    destination = str(network_to_ipaddress(network))

                    via = adjacency[router_id][next_first_hop]

                    route = {
                        "to": destination,
                        "via": via,
                    }

                    if route not in routes:
                        routes.append(route)

        router["_static_routes"] = routes

def normalize_and_validate(topology: dict[str, Any]) -> dict[str, Any]:
    networks = topology.get("networks") or []
    devices = topology.get("devices") or []
    links = topology.get("links") or []

    if not isinstance(networks, list):
        raise ValueError("topology.networks must be a list")
    if not isinstance(devices, list):
        raise ValueError("topology.devices must be a list")
    if not isinstance(links, list):
        raise ValueError("topology.links must be a list")

    networks_by_id: dict[str, dict[str, Any]] = {}
    for network in networks:
        validate_network(network)
        network_id = network["id"]
        if network_id in networks_by_id:
            raise ValueError(f"Duplicate network id: {network_id}")
        networks_by_id[network_id] = network

    devices_by_id: dict[str, dict[str, Any]] = {}
    for device in devices:
        validate_device_basic(device)
        device_id = device["id"]
        if device_id in devices_by_id:
            raise ValueError(f"Duplicate device id: {device_id}")
        devices_by_id[device_id] = device

    validate_network_members(networks_by_id, devices_by_id)
    validate_links(links, devices_by_id)

    validate_dns_servers(devices)
    validate_load_balancers(devices, devices_by_id, links)

    # Router-router links need generated transit Docker networks.
    add_transit_networks_for_router_links(networks_by_id, devices_by_id, links)

    # Mutates device dictionaries by adding generated fields used by device builders.
    for device in devices:
        if device["type"] in {"host", "switch", "server", "load_balancer", "dns_server"}:
            attach_single_network_device(device, networks_by_id)
        elif device["type"] == "router":
            attach_router_networks(device, networks_by_id, devices_by_id)

    validate_ips(devices, networks_by_id)

    generate_router_static_routes(devices, networks_by_id, devices_by_id)

    return {
        "networks": networks,
        "networks_by_id": networks_by_id,
        "devices": devices,
        "devices_by_id": devices_by_id,
        "links": links,
    }


def validate_network(network: dict[str, Any]) -> None:
    network_id = network.get("id")
    if not network_id:
        raise ValueError("Every network needs an id")

    config = network.get("config") or {}
    subnet = config.get("subnet")
    mask = str(config.get("mask", ""))

    if not subnet or not mask:
        raise ValueError(f"Network {network_id} needs config.subnet and config.mask")

    try:
        ipaddress.ip_network(f"{subnet}/{mask}", strict=False)
    except ValueError as exc:
        raise ValueError(f"Invalid subnet for network {network_id}: {subnet}/{mask}") from exc

    members = network.get("members", [])
    if not isinstance(members, list):
        raise ValueError(f"Network {network_id}.members must be a list")


def validate_device_basic(device: dict[str, Any]) -> None:
    device_id = device.get("id")
    device_type = device.get("type")

    if not device_id:
        raise ValueError("Every device needs an id")
    if device_type not in SUPPORTED_TYPES:
        raise ValueError(f"Device {device_id} has unsupported type: {device_type}")

    if not isinstance(device.get("config", {}), dict):
        raise ValueError(f"Device {device_id}.config must be an object")
    if not isinstance(device.get("networks", []), list):
        raise ValueError(f"Device {device_id}.networks must be a list")
    
def validate_load_balancers(
    devices: list[dict[str, Any]],
    devices_by_id: dict[str, dict[str, Any]],
    links: list[dict[str, Any]],
) -> None:
    for device in devices:
        if device.get("type") != "load_balancer":
            continue

        lb_id = device["id"]
        linked_server_ids: set[str] = set()

        for link in links:
            source = link.get("source")
            target = link.get("target")

            if source == lb_id:
                peer_id = target
            elif target == lb_id:
                peer_id = source
            else:
                continue

            peer = devices_by_id.get(peer_id)
            if not peer:
                continue

            if peer.get("type") == "server":
                linked_server_ids.add(peer_id)
            elif peer.get("type") in {"switch", "router"}:
                # Connectivity links are allowed, but they are not nginx upstreams.
                continue
            else:
                raise ValueError(
                    f"Load balancer {lb_id} cannot connect to {peer.get('type')} {peer_id}"
                )

        if not linked_server_ids:
            raise ValueError(f"Load balancer {lb_id} must connect to at least one server")

        config = device.get("config") or {}
        if not config.get("ip_address"):
            raise ValueError(f"Load balancer {lb_id} needs config.ip_address")
        if not config.get("domain"):
            raise ValueError(f"Load balancer {lb_id} needs config.domain")

        for server_id in linked_server_ids:
            server = devices_by_id[server_id]
            server_config = server.get("config") or {}

            if not server_config.get("ip_address"):
                raise ValueError(f"Server {server_id} connected to {lb_id} needs config.ip_address")


def validate_network_members(
    networks_by_id: dict[str, dict[str, Any]],
    devices_by_id: dict[str, dict[str, Any]],
) -> None:
    for network_id, network in networks_by_id.items():
        for member_id in network.get("members", []):
            if member_id not in devices_by_id:
                raise ValueError(f"Network {network_id} references unknown member {member_id}")


def validate_links(links: list[dict[str, Any]], devices_by_id: dict[str, dict[str, Any]]) -> None:
    for index, link in enumerate(links):
        source = link.get("source")
        target = link.get("target")
        if source not in devices_by_id:
            raise ValueError(f"Link #{index} references unknown source {source}")
        if target not in devices_by_id:
            raise ValueError(f"Link #{index} references unknown target {target}")
        

def validate_dns_servers(devices: list[dict[str, Any]]) -> None:
    for device in devices:
        if device.get("type") != "dns_server":
            continue

        config = device.get("config") or {}

        if not config.get("ip_address"):
            raise ValueError(f"DNS server {device['id']} needs config.ip_address")

        records = config.get("records") or []
        if not isinstance(records, list):
            raise ValueError(f"DNS server {device['id']} config.records must be a list")

        for index, record in enumerate(records):
            if not isinstance(record, dict):
                raise ValueError(f"DNS server {device['id']} record #{index} must be an object")

            if not record.get("domain") or not record.get("ip"):
                raise ValueError(
                    f"DNS server {device['id']} record #{index} needs domain and ip"
                )


def attach_single_network_device(
    device: dict[str, Any],
    networks_by_id: dict[str, dict[str, Any]],
) -> None:
    device_id = device["id"]
    network_ids = device.get("networks") or []

    if len(network_ids) != 1:
        raise ValueError(f"{device['type']} {device_id} must belong to exactly one network")

    network_id = network_ids[0]
    if network_id not in networks_by_id:
        raise ValueError(f"Device {device_id} references unknown network {network_id}")

    device["_attachments"] = [
        {
            "network_id": network_id,
            "ip": device.get("config", {}).get("ip_address"),
        }
    ]


def attach_router_networks(
    router: dict[str, Any],
    networks_by_id: dict[str, dict[str, Any]],
    devices_by_id: dict[str, dict[str, Any]],
) -> None:
    router_id = router["id"]
    interfaces = (router.get("config") or {}).get("interfaces") or {}

    if not interfaces:
        raise ValueError(f"Router {router_id} needs config.interfaces")

    attachments: list[dict[str, str]] = []
    seen_networks: set[str] = set()

    for peer_id, iface in interfaces.items():
        if peer_id not in devices_by_id:
            raise ValueError(f"Router {router_id} interface references unknown device {peer_id}")

        peer = devices_by_id[peer_id]
        peer_type = peer.get("type")

        ip = iface.get("ip")
        if not ip:
            raise ValueError(f"Router {router_id} interface to {peer_id} needs an ip")

        if peer_type == "router":
            subnet = iface.get("subnet")
            mask = str(iface.get("mask", ""))

            if not subnet or not mask:
                raise ValueError(f"Router {router_id} interface to {peer_id} needs subnet and mask")

            ip_net = ipaddress.ip_network(f"{subnet}/{mask}", strict=False)
            network_id = transit_network_id_from_subnet(
                str(ip_net.network_address),
                str(ip_net.prefixlen),
            )

            if network_id not in networks_by_id:
                raise ValueError(
                    f"Router-router interface {router_id} -> {peer_id} has no transit network"
                )

        else:
            peer_networks = peer.get("networks") or []

            if len(peer_networks) != 1:
                raise ValueError(
                    f"Router {router_id} interface peer {peer_id} must belong to exactly one network"
                )

            network_id = peer_networks[0]

            if network_id not in networks_by_id:
                raise ValueError(f"Router {router_id} references unknown network {network_id}")

        if network_id in seen_networks:
            continue

        attachments.append(
            {
                "network_id": network_id,
                "ip": ip,
                "peer_id": peer_id,
            }
        )
        seen_networks.add(network_id)

    router["_attachments"] = attachments


def validate_ips(devices: list[dict[str, Any]], networks_by_id: dict[str, dict[str, Any]]) -> None:
    used_ips: dict[str, str] = {}

    for device in devices:
        for attachment in device.get("_attachments", []):
            network_id = attachment["network_id"]
            ip = attachment.get("ip")

            # Switches may not need a static IP. They are cosmetic/debug containers.
            if not ip:
                continue

            network = networks_by_id[network_id]
            ip_net = network_to_ipaddress(network)

            try:
                ip_obj = ipaddress.ip_address(ip)
            except ValueError as exc:
                raise ValueError(f"Device {device['id']} has invalid IP {ip}") from exc

            if ip_obj not in ip_net:
                raise ValueError(
                    f"Device {device['id']} IP {ip} is not inside network {network_id} ({ip_net})"
                )

            key = f"{network_id}:{ip}"
            if key in used_ips:
                raise ValueError(
                    f"Duplicate IP {ip} on network {network_id}: {used_ips[key]} and {device['id']}"
                )
            used_ips[key] = device["id"]


def network_to_ipaddress(network: dict[str, Any]) -> ipaddress.IPv4Network | ipaddress.IPv6Network:
    config = network.get("config") or {}
    return ipaddress.ip_network(f"{config['subnet']}/{config['mask']}", strict=False)


def build_compose_networks(networks_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    compose_networks: dict[str, Any] = {}

    for network_id, network in networks_by_id.items():
        config = network.get("config") or {}
        subnet = f"{config['subnet']}/{config['mask']}"

        network_def: dict[str, Any] = {
            "driver": "bridge",
            "ipam": {
                "config": [
                    {
                        "subnet": subnet,
                    }
                ]
            },
        }

        # Optional: Compose supports this. However, beware: if Docker owns the
        # network gateway IP, it may conflict with your router container using
        # the same address. Therefore, by default, do NOT set Docker's gateway
        # to the router IP. Let the container enforce default routes instead.
        #
        # If you later want Docker's bridge gateway to be explicit, use a
        # different gateway IP than your router interface.

        compose_networks[network_id] = network_def

    return compose_networks


def copy_template(device_type: str, destination: Path) -> None:
    template_dir = TEMPLATES_DIR / device_type
    if not template_dir.exists():
        raise ValueError(f"Missing template directory: {template_dir}")

    shutil.copytree(template_dir, destination, dirs_exist_ok=True)


def render_template_file(path: Path, variables: dict[str, Any]) -> None:
    text = path.read_text(encoding="utf-8")
    for key, value in variables.items():
        text = text.replace("{{" + key + "}}", "" if value is None else str(value))
    path.write_text(text, encoding="utf-8")

if __name__ == "__main__":
    import json

    with open('/Users/joselopes/Desktop/vno-topology-1778491609278.json') as json_file:
        data = json.load(json_file)
        generate(data)