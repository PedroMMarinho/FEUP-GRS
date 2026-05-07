from __future__ import annotations

from typing import Any

from project.backend.devices.common import base_service, compose_network_attachments


def build_switch_service(device: dict[str, Any], normalized: dict[str, Any]) -> dict[str, Any]:
    service = base_service(device)
    service["networks"] = compose_network_attachments(device, require_ip=False)
    return service


def render_switch_context(device: dict[str, Any]) -> None:
    from project.backend.generator import OUTPUT_DIR, copy_template, render_template_file

    config = device.get("config") or {}
    destination = OUTPUT_DIR / device["id"]

    copy_template("switch", destination)
    render_template_file(
        destination / "init.sh",
        {
            "hostname": config.get("hostname", device["id"]),
            "gateway": config.get("gateway", ""),
        },
    )
