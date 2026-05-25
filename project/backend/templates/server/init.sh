#!/bin/bash

set -e

HOSTNAME_VALUE="{{hostname}}"
GATEWAY="{{gateway}}"
DOMAIN="{{domain}}"
PORT="{{port}}"
IP_ADDRESS="{{ip_address}}"

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
    echo "[server] Default gateway enforced to $GATEWAY"
else
    echo "[server] No gateway configured"
fi

cat > /tmp/server.py <<EOF
from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import socket

hostname = os.environ.get("HOSTNAME_VALUE", socket.gethostname())
domain = os.environ.get("DOMAIN", "")
ip_address = os.environ.get("IP_ADDRESS", "")
port = int(os.environ.get("PORT", "80"))

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = (
            f"Hello from {hostname}\\n"
            f"Domain: {domain}\\n"
            f"IP: {ip_address}\\n"
            f"Path: {self.path}\\n"
        ).encode()

        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("[server]", fmt % args)

HTTPServer(("0.0.0.0", port), Handler).serve_forever()
EOF

echo "[server] started as $(hostname)"
echo "[server] serving HTTP on port $PORT"

HOSTNAME_VALUE="$HOSTNAME_VALUE" DOMAIN="$DOMAIN" IP_ADDRESS="$IP_ADDRESS" PORT="$PORT" \
    python3 /tmp/server.py