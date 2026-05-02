#!/bin/sh
set -e

echo "{{hostname}}" > /etc/hostname
hostname {{hostname}}

# Create bridge for VLAN {{vlan_id}}
ip link add name br{{vlan_id}} type bridge 2>/dev/null || true
ip link set br{{vlan_id}} up

# Attach all eth interfaces (except eth0/lo) to bridge
for iface in $(ls /sys/class/net | grep -v lo | grep -v eth0); do
    ip link set "$iface" master br{{vlan_id}} 2>/dev/null || true
done

echo "[switch] {{hostname}} ready — VLAN {{vlan_id}}, {{port_count}} ports"
exec tail -f /dev/null