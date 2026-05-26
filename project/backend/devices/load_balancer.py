from __future__ import annotations

from typing import Any

from backend.devices.common import base_service, compose_network_attachments


def build_load_balancer_service(device: dict[str, Any], normalized: dict[str, Any]) -> dict[str, Any]:
    service = base_service(device)
    service["networks"] = compose_network_attachments(device, require_ip=True)
    return service


def _linked_servers(load_balancer: dict[str, Any], normalized: dict[str, Any]) -> list[dict[str, Any]]:
    lb_id = load_balancer["id"]
    devices_by_id = normalized["devices_by_id"]
    links = normalized["links"]

    servers: list[dict[str, Any]] = []

    for link in links:
        source = link.get("source")
        target = link.get("target")

        if source == lb_id:
            candidate_id = target
        elif target == lb_id:
            candidate_id = source
        else:
            continue

        candidate = devices_by_id.get(candidate_id)
        if candidate and candidate.get("type") == "server":
            servers.append(candidate)

    # Avoid duplicated upstream servers if duplicate links exist.
    unique: dict[str, dict[str, Any]] = {}
    for server in servers:
        unique[server["id"]] = server

    return list(unique.values())


def _nginx_upstream_directive(algorithm: str) -> str:
    if algorithm == "least_conn":
        return "    least_conn;\n"
    if algorithm == "ip_hash":
        return "    ip_hash;\n"
    return ""


def render_load_balancer_context(device: dict[str, Any], normalized: dict[str, Any]) -> None:
    from backend.generator import OUTPUT_DIR, copy_template, render_template_file

    config = device.get("config") or {}
    destination = OUTPUT_DIR / device["id"]

    servers = _linked_servers(device, normalized)

    if not servers:
        raise ValueError(f"Load balancer {device['id']} must be connected to at least one server")

    upstream_lines: list[str] = []

    for server in servers:
        server_config = server.get("config") or {}
        server_ip = server_config.get("ip_address")
        server_port = server_config.get("port", "80")

        if not server_ip:
            raise ValueError(f"Server {server['id']} connected to {device['id']} needs config.ip_address")

        upstream_lines.append(f"        server {server_ip}:{server_port};")

    algorithm = config.get("algorithm", "round_robin")

    copy_template("load_balancer", destination)

    render_template_file(
        destination / "nginx.conf",
        {
            "domain": config.get("domain", "_"),
            "listen_port": config.get("port", "80"),
            "upstream_algorithm": _nginx_upstream_directive(algorithm).rstrip(),
            "upstream_servers": "\n".join(upstream_lines),
        },
    )

    render_template_file(
        destination / "init.sh",
        {
            "hostname": config.get("hostname", device["id"]),
            "gateway": config.get("gateway", ""),
            "domain": config.get("domain", ""),
            "port": config.get("port", "80"),
        },
    )