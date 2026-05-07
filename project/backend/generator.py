from __future__ import annotations

import ipaddress
import shutil
from pathlib import Path
from typing import Any

import yaml

from project.backend.devices.host import build_host_service, render_host_context
from project.backend.devices.router import build_router_service, render_router_context
from project.backend.devices.switch import build_switch_service, render_switch_context

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
OUTPUT_DIR = BASE_DIR / "generated" / "network"
COMPOSE_FILE = OUTPUT_DIR / "docker-compose.yml"

SUPPORTED_TYPES = {"host", "switch", "router"}


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

    # Mutates device dictionaries by adding generated fields used by device builders.
    for device in devices:
        if device["type"] in {"host", "switch"}:
            attach_single_network_device(device, networks_by_id)
        elif device["type"] == "router":
            attach_router_networks(device, networks_by_id, devices_by_id)

    validate_ips(devices, networks_by_id)

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
        peer_networks = peer.get("networks") or []
        if len(peer_networks) != 1:
            raise ValueError(
                f"Router {router_id} interface peer {peer_id} must belong to exactly one network"
            )

        network_id = peer_networks[0]
        if network_id not in networks_by_id:
            raise ValueError(f"Router {router_id} references unknown network {network_id}")

        ip = iface.get("ip")
        if not ip:
            raise ValueError(f"Router {router_id} interface to {peer_id} needs an ip")

        if network_id in seen_networks:
            # Same router connected twice to the same Docker network is not useful here.
            continue

        attachments.append({"network_id": network_id, "ip": ip, "peer_id": peer_id})
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
    # importing the module
    import json

    # Opening JSON file
    with open('/Users/joselopes/Desktop/vno-topology-1778181748310.json') as json_file:
        data = json.load(json_file)
        generate(data)