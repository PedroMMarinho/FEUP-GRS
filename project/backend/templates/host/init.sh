#!/bin/bash
set -e

echo "[host] Starting network configuration for {{hostname}}"

# -------------------------------------------------------
# 1. Assign static IP to eth0
# -------------------------------------------------------
ip addr flush dev eth0 2>/dev/null || true
ip addr add {{ip_address}}/{{subnet_mask}} dev eth0 2>/dev/null || true
ip link set eth0 up

echo "[host] Assigned {{ip_address}}/{{subnet_mask}} to eth0"

# -------------------------------------------------------
# 2. Override Docker's default gateway with the real one.
#
#    Docker's bridge daemon re-injects a default route
#    (via the bridge .1 address) asynchronously after the
#    container starts. A one-shot delete races and loses.
#
#    Strategy: poll in a background loop — every second,
#    check whether the default still points somewhere other
#    than our gateway, and if so, forcibly replace it.
#    The loop exits once the correct route is stable.
# -------------------------------------------------------
GATEWAY="{{gateway}}"

_fix_gateway() {
    while true; do
        CURRENT=$(ip route show default 2>/dev/null | awk '{print $3; exit}')
        if [ "$CURRENT" != "$GATEWAY" ]; then
            ip route del default 2>/dev/null || true
            ip route add default via "$GATEWAY" 2>/dev/null || true
        fi
        sleep 1
    done
}

# Run the enforcer in the background for the first 10 seconds,
# then it becomes a low-frequency watchdog (every 30s) forever.
(
    for i in $(seq 1 10); do
        CURRENT=$(ip route show default 2>/dev/null | awk '{print $3; exit}')
        if [ "$CURRENT" != "$GATEWAY" ]; then
            ip route del default 2>/dev/null || true
            ip route add default via "$GATEWAY" 2>/dev/null || true
        fi
        sleep 1
    done
    # Slow watchdog — catches any later re-injection
    while true; do
        CURRENT=$(ip route show default 2>/dev/null | awk '{print $3; exit}')
        if [ "$CURRENT" != "$GATEWAY" ]; then
            ip route del default 2>/dev/null || true
            ip route add default via "$GATEWAY" 2>/dev/null || true
            echo "[host] Gateway drift detected — corrected to $GATEWAY"
        fi
        sleep 30
    done
) &

# Give the first iteration a moment to run before we continue
sleep 2

echo "[host] Default gateway enforced to {{gateway}}"

# -------------------------------------------------------
# 3. Optional: VLAN tagging
# -------------------------------------------------------
{{#vlan_id}}
modprobe 8021q 2>/dev/null || true
ip link add link eth0 name eth0.{{vlan_id}} type vlan id {{vlan_id}} 2>/dev/null || true
ip link set eth0.{{vlan_id}} up
echo "[host] VLAN {{vlan_id}} interface created"
{{/vlan_id}}

echo "[host] Network configuration complete"
echo "  IP:      {{ip_address}}/{{subnet_mask}}"
echo "  Gateway: {{gateway}}"
echo "  Host:    {{hostname}}"

# Keep the container running
exec tail -f /dev/null