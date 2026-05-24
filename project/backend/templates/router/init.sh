#!/bin/bash

set -e

STATIC_ROUTES="{{static_routes}}"
OSPF_ENABLED="{{ospf_enabled}}"
OSPF_CONFIG="{{ospf_config}}"

_add_static_routes_once() {
    echo "$STATIC_ROUTES" | while IFS= read -r ROUTE; do
        [ -z "$ROUTE" ] && continue
        ip route replace $ROUTE 2>/dev/null || true
    done
}

_start_ospf() {
    mkdir -p /etc/frr /var/log/frr /var/run/frr

    cat > /etc/frr/frr.conf <<EOF
$OSPF_CONFIG
EOF

    # FRR expects these permissions/groups.
    chown -R frr:frr /etc/frr /var/log/frr 2>/dev/null || true
    chown -R frr:frrvty /var/run/frr 2>/dev/null || true
    chmod 775 /var/run/frr 2>/dev/null || true
    chmod 640 /etc/frr/frr.conf 2>/dev/null || true

    echo "[router] FRR config:"
    cat /etc/frr/frr.conf

    echo "[router] Starting zebra directly"
    /usr/lib/frr/zebra \
        -d \
        -A 127.0.0.1 \
        -f /etc/frr/frr.conf

    sleep 1

    echo "[router] Starting ospfd directly"
    /usr/lib/frr/ospfd \
        -d \
        -A 127.0.0.1 \
        -f /etc/frr/frr.conf

    sleep 2

    echo "[router] FRR processes:"
    ps aux | grep -E "zebra|ospfd" | grep -v grep || true

    echo "[router] OSPF neighbors:"
    vtysh -c "show ip ospf neighbor" || true

    echo "[router] OSPF routes:"
    vtysh -c "show ip route ospf" || true
}

FORWARDING=$(cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || echo "unknown")

echo "[router] IPv4 forwarding is: $FORWARDING"

if [ "$FORWARDING" != "1" ]; then
    echo "[router] WARNING: IPv4 forwarding is not enabled."
fi

if [ "$OSPF_ENABLED" = "true" ]; then
    _start_ospf
    echo "[router] OSPF enabled"
else
    echo "[router] OSPF disabled"

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
fi

echo "[router] started as $(hostname)"

tail -f /dev/null