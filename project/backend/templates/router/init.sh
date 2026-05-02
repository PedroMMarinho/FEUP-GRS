#!/bin/bash
set -e

sysctl -w net.ipv4.ip_forward=1 || true

{{interfaces}}

echo "[router] {{hostname}} ready"
sleep infinity