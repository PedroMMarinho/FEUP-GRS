from collections import defaultdict
from .utils import dotted_mask_to_cidr


def derive_networks(devices: list[dict], links: list[dict]) -> list[dict]:
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
                mask = dotted_mask_to_cidr(cfg["subnet_mask"])
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