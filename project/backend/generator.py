from pathlib import Path

from generator.networks import derive_networks
from generator.compose import build_yaml, network_to_compose_entry
import generator.host   as host_gen
import generator.switch as switch_gen
import generator.router as router_gen

TEMPLATES_DIR = Path(__file__).parent / "templates"
OUTPUT_DIR    = Path(__file__).parent / "output"

# Map device type string → generator module
_GENERATORS = {
    "host":   host_gen,
    "switch": switch_gen,
    "router": router_gen,
}


def generate(topology: dict) -> str:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    devices: list[dict] = topology.get("devices", [])
    links:   list[dict] = topology.get("links", [])

    derived_networks = derive_networks(devices, links)

    services: dict = {}
    for device in devices:
        device_type = device.get("type")
        gen = _GENERATORS.get(device_type)
        if gen is None:
            raise ValueError(f"Unknown device type '{device_type}' for device '{device['id']}'")

        gen.build_context(device, TEMPLATES_DIR, OUTPUT_DIR, derived_networks)
        services[device["id"]] = gen.to_compose_service(device, derived_networks)

    compose_networks = {n["id"]: network_to_compose_entry(n) for n in derived_networks}
    compose = build_yaml(services, compose_networks)

    (OUTPUT_DIR / "docker-compose.yml").write_text(compose)
    return compose

if __name__ == "__main__":
    # Python program to demonstrate
    # Conversion of JSON data to
    # dictionary

    # importing the module
    import json

    # Opening JSON file
    with open('/Users/joselopes/Desktop/vno-topology-1778166880240.json') as json_file:
        data = json.load(json_file)

        generate(data)