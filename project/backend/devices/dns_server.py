from __future__ import annotations

from typing import Any

from backend.devices.common import base_service, compose_network_attachments


def build_dns_server_service(device: dict[str, Any], normalized: dict[str, Any]) -> dict[str, Any]:
    service = base_service(device)
    service["networks"] = compose_network_attachments(device, require_ip=True)
    return service


def _render_dns_records(records: list[dict[str, Any]]) -> str:
    lines: list[str] = []

    for record in records:
        domain = str(record.get("domain") or "").strip()
        ip = str(record.get("ip") or "").strip()

        if not domain or not ip:
            continue

        # dnsmasq format:
        # address=/app.local/10.0.3.100
        lines.append(f"address=/{domain}/{ip}")

    return "\n".join(lines)


def render_dns_server_context(device: dict[str, Any]) -> None:
    from backend.generator import OUTPUT_DIR, copy_template, render_template_file

    config = device.get("config") or {}
    destination = OUTPUT_DIR / device["id"]

    records = config.get("records") or []
    if not isinstance(records, list):
        raise ValueError(f"DNS server {device['id']} config.records must be a list")

    copy_template("dns_server", destination)

    render_template_file(
        destination / "dnsmasq.conf",
        {
            "dns_records": _render_dns_records(records),
            "upstream_dns": config.get("upstream_dns", "8.8.8.8"),
        },
    )

    render_template_file(
        destination / "init.sh",
        {
            "hostname": config.get("hostname", device["id"]),
            "gateway": config.get("gateway", ""),
            "ip_address": config.get("ip_address", ""),
            "domain": config.get("domain", "local"),
            "upstream_dns": config.get("upstream_dns", "8.8.8.8"),
        },
    )