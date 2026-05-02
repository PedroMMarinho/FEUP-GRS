#!/bin/sh
set -e

ip addr add {{ip_address}}/{{subnet_mask}} dev eth0 2>/dev/null || true
ip link set eth0 up
ip route add default via {{gateway}} 2>/dev/null || true

echo "{{hostname}}" > /etc/hostname
hostname {{hostname}}

echo "[host] {{hostname}} ready — {{ip_address}}"
exec tail -f /dev/null