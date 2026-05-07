from typing import Any


def build_yaml(services: dict, networks: dict) -> str:
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


def network_to_compose_entry(net: dict) -> dict:
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