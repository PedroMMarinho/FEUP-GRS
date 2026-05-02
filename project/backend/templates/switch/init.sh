#!/bin/bash
set -e

echo "[switch] Starting L2 bridge configuration for {{hostname}}"

# -------------------------------------------------------
# 1. Default VLAN to 1 if not set
# -------------------------------------------------------
VLAN_ID="{{vlan_id}}"
if [ -z "$VLAN_ID" ]; then
    VLAN_ID=1
fi
echo "[switch] Using VLAN ID: $VLAN_ID"

# -------------------------------------------------------
# 2. Load required kernel modules
# -------------------------------------------------------
modprobe bridge 2>/dev/null || true
modprobe 8021q  2>/dev/null || true

# -------------------------------------------------------
# 3. Create Linux bridge br0
# -------------------------------------------------------
ip link add name br0 type bridge 2>/dev/null || true
ip link set br0 up

# Disable STP for simpler simulation (no port blocking delays)
echo 0 > /sys/class/net/br0/bridge/stp_state 2>/dev/null || true

echo "[switch] Bridge br0 created"

# -------------------------------------------------------
# 4. Attach all available ethernet interfaces to the bridge
#    Docker will have created eth0, eth1, eth2… based on
#    how many networks this container is attached to.
# -------------------------------------------------------
for iface in $(ls /sys/class/net/ | grep -E '^eth[0-9]+$'); do
    ip link set "$iface" up 2>/dev/null || true
    ip link set "$iface" master br0 2>/dev/null || true
    echo "[switch] Enslaved $iface → br0"
done

# -------------------------------------------------------
# 5. Optional: VLAN filtering on the bridge
# -------------------------------------------------------
{{#vlan_id}}
# Enable VLAN filtering and tag the bridge ports
echo 1 > /sys/class/net/br0/bridge/vlan_filtering 2>/dev/null || true

for iface in $(ls /sys/class/net/ | grep -E '^eth[0-9]+$'); do
    bridge vlan add vid {{vlan_id}} dev "$iface" 2>/dev/null || true
    bridge vlan add vid {{vlan_id}} dev br0 self 2>/dev/null || true
    echo "[switch] Added VLAN {{vlan_id}} to $iface"
done
{{/vlan_id}}

echo "[switch] L2 bridge configuration complete"
echo "  Host:    {{hostname}}"
echo "  VLAN:    $VLAN_ID"
echo "  Bridge:  br0"

# Keep the container running
exec tail -f /dev/null