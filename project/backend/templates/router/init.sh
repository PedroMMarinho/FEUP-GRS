#!/bin/bash
set -e

sysctl -w net.ipv4.ip_forward=1 || true
ip addr add {{ip_address}}/24 dev eth0 2>/dev/null || true
ip link set eth0 up

echo "[router] {{hostname}} ready — {{ip_address}}"
sleep infinity