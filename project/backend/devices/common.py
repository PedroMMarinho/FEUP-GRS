from __future__ import annotations

from typing import Any


def device_context_path(device_id: str) -> str:
    return f"./{device_id}"


def base_service(device: dict[str, Any]) -> dict[str, Any]:
    return {
        "build": device_context_path(device["id"]),
        "container_name": (device.get("config") or {}).get("hostname", device["id"]),
        "hostname": (device.get("config") or {}).get("hostname", device["id"]),
        "cap_add": ["NET_ADMIN"],
        "tty": True,
        "stdin_open": True,
    }


def compose_network_attachments(device: dict[str, Any], require_ip: bool = False) -> dict[str, Any]:
    networks: dict[str, Any] = {}

    for attachment in device.get("_attachments", []):
        network_id = attachment["network_id"]
        ip = attachment.get("ip")

        if require_ip and not ip:
            raise ValueError(f"Device {device['id']} needs an IP address on network {network_id}")

        networks[network_id] = {}
        if ip:
            networks[network_id]["ipv4_address"] = ip

    return networks
