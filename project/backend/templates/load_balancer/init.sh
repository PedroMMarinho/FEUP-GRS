#!/bin/bash

set -e

HOSTNAME_VALUE="{{hostname}}"
GATEWAY="{{gateway}}"
DOMAIN="{{domain}}"
PORT="{{port}}"

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
    echo "[load-balancer] Default gateway enforced to $GATEWAY"
else
    echo "[load-balancer] No gateway configured"
fi

echo "[load-balancer] started as $(hostname)"
echo "[load-balancer] domain: $DOMAIN"
echo "[load-balancer] listening on port $PORT"
echo "[load-balancer] nginx config:"
cat /etc/nginx/nginx.conf

nginx -g "daemon off;"