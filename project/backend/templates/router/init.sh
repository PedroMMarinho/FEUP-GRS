#!/bin/bash

set -e

STATIC_ROUTES="{{static_routes}}"

_add_static_routes_once() {
    echo "$STATIC_ROUTES" | while IFS= read -r ROUTE; do
        [ -z "$ROUTE" ] && continue
        ip route replace $ROUTE 2>/dev/null || true
    done
}

FORWARDING=$(cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || echo "unknown")

echo "[router] IPv4 forwarding is: $FORWARDING"

if [ "$FORWARDING" != "1" ]; then
    echo "[router] WARNING: IPv4 forwarding is not enabled."
fi

if [ -n "$STATIC_ROUTES" ]; then
    _add_static_routes_once

    (
        while true; do
            _add_static_routes_once
            sleep 30
        done
    ) &

    echo "[router] Static routes configured:"
    echo "$STATIC_ROUTES"
else
    echo "[router] No static routes configured"
fi

echo "[router] started as $(hostname)"

tail -f /dev/null