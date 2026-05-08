#!/bin/bash

set -e

GATEWAY="{{gateway}}"

_fix_gateway_once() {
    CURRENT=$(ip route show default 2>/dev/null | awk '{print $3; exit}')

    if [ "$CURRENT" != "$GATEWAY" ]; then
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
    echo "[host] Default gateway enforced to $GATEWAY"
else
    echo "[host] No gateway configured"
fi

echo "[host] started as $(hostname)"

tail -f /dev/null