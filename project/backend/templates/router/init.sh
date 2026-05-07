#!/bin/bash

set -e

FORWARDING=$(cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || echo "unknown")

echo "[router] IPv4 forwarding is: $FORWARDING"

if [ "$FORWARDING" != "1" ]; then
    echo "[router] WARNING: IPv4 forwarding is not enabled."
    echo "[router] Make sure docker-compose.yml has:"
    echo "[router]   sysctls:"
    echo "[router]     net.ipv4.ip_forward: \"1\""
fi

echo "[router] started as $(hostname)"

tail -f /dev/null