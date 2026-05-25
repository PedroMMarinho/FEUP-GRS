from __future__ import annotations

import ipaddress
from typing import Any

from backend.devices.common import base_service, compose_network_attachments


def build_router_service(device: dict[str, Any], normalized: dict[str, Any]) -> dict[str, Any]:
    service = base_service(device)
    service["networks"] = compose_network_attachments(device, require_ip=True)

    # FRR/zebra needs SYS_ADMIN in addition to NET_ADMIN/NET_RAW in this Docker setup.
    service["cap_add"] = [
        "NET_ADMIN",
        "NET_RAW",
        "SYS_ADMIN",
    ]

    service["sysctls"] = {
        "net.ipv4.ip_forward": "1",
    }

    return service


def _router_id_from_device_id(device_id: str) -> str:
    """
    Build a stable OSPF router-id from the device id.

    OSPF router IDs only need to be unique in the OSPF domain.
    This generates something like 1.1.X.Y.
    """
    value = sum(ord(c) for c in device_id) % 65000
    third = (value // 255) % 255
    fourth = value % 255
    return f"1.1.{third}.{fourth}"


def _build_ospf_config(device: dict[str, Any]) -> str:
    config = device.get("config") or {}
    hostname = config.get("hostname") or device["id"]
    router_id = str(config.get("ospf_router_id") or _router_id_from_device_id(device["id"]))

    interfaces = config.get("interfaces") or {}

    network_entries: list[tuple[str, str]] = []

    for iface in interfaces.values():
        subnet = iface.get("subnet")
        mask = iface.get("mask")

        if not subnet or not mask:
            continue

        network = ipaddress.ip_network(f"{subnet}/{mask}", strict=False)
        cidr = str(network)

        area = str(iface.get("ospf_area") or "0.0.0.0")

        entry = (cidr, area)
        if entry not in network_entries:
            network_entries.append(entry)

    network_lines = "\n".join(
        f" network {network} area {area}"
        for network, area in network_entries
    )

    interface_blocks: list[str] = []

    # Docker assigns eth0, eth1, eth2... according to the compose network
    # attachment order. compose_network_attachments() preserves _attachments order.
    for index, attachment in enumerate(device.get("_attachments", [])):
        peer_id = attachment.get("peer_id")
        iface = interfaces.get(peer_id) or {}

        cost = iface.get("ospf_cost")

        if not cost:
            continue

        interface_blocks.append(
            f"""!
                interface eth{index}
                ip ospf cost {cost}
            """
        )

    interface_config = "\n".join(interface_blocks)

    return f""" frr defaults traditional
                hostname {hostname}
                log stdout
                service integrated-vtysh-config
                ip forwarding
                !
                router ospf
                ospf router-id {router_id}
                log-adjacency-changes detail
                {network_lines}
                {interface_config}
                !
                line vty
                !
            """


def render_router_context(device: dict[str, Any]) -> None:
    from backend.generator import OUTPUT_DIR, copy_template, render_template_file

    config = device.get("config") or {}
    destination = OUTPUT_DIR / device["id"]

    routes = device.get("_static_routes", [])
    static_routes = "\n".join(
        f"{route['to']} via {route['via']}"
        for route in routes
    )

    ospf_enabled = bool(config.get("ospf_enabled"))
    ospf_config = _build_ospf_config(device) if ospf_enabled else ""

    copy_template("router", destination)
    render_template_file(
        destination / "init.sh",
        {
            "hostname": config.get("hostname") or device["id"],
            "static_routes": static_routes,
            "ospf_enabled": "true" if ospf_enabled else "false",
            "ospf_config": ospf_config,
        },
    )