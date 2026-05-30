#!/bin/bash

set -e

GATEWAY="{{gateway}}"
IP_ADDRESS="{{ip_address}}"
DOMAIN="{{domain}}"
UPSTREAM_DNS="{{upstream_dns}}"

_fix_gateway_once() {
    CURRENT=$(ip route show default 2>/dev/null | awk '{print $3; exit}')

    if [ -n "$GATEWAY" ] && [ "$CURRENT" != "$GATEWAY" ]; then
        ip route del default 2>/dev/null || true
        ip route add default via "$GATEWAY" 2>/dev/null || true
    fi
}

if [ -n "$GATEWAY" ]; then
    (
        for i in $(seq 1 10); do
            _fix_gateway_once
            sleep 1
        done

        while true; do
            _fix_gateway_once
            sleep 30
        done
    ) &

    sleep 2
    echo "[dns] Default gateway enforced to $GATEWAY"
else
    echo "[dns] No gateway configured"
fi

echo "[dns] started as $(hostname)"
echo "[dns] IP: $IP_ADDRESS"
echo "[dns] domain: $DOMAIN"
echo "[dns] upstream DNS: $UPSTREAM_DNS"
echo "[dns] dnsmasq config:"
cat /etc/dnsmasq.conf

exec dnsmasq --no-daemon --conf-file=/etc/dnsmasq.conf