#!/bin/bash

set -euo pipefail

# small delay to let Docker assign IPs
sleep 1

# Map specific IP -> desired interface name
declare -A ip2name=(
  [172.31.255.253]=eth2
  [10.0.1.2]=eth0
  [10.0.1.10]=eth1
  [10.0.1.3]=eth0
  [10.0.1.19]=eth1
  [10.0.1.11]=eth0
  [10.0.1.18]=eth1
  [172.16.123.130]=eth2
  [172.16.123.158]=eth2
)

for iface in $(ls /sys/class/net | grep -E '^eth'); do
  ip=$(ip -4 addr show "$iface" 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 || true)
  [ -z "$ip" ] && continue

  target="${ip2name[$ip]:-}"
  if [ -n "$target" ]; then
    echo "Renaming $iface ($ip) -> $target"
    ip link set "$iface" down
    ip link set "$iface" name "$target"
    ip link set "$target" up
  else
    echo "No mapping for $iface ($ip), leaving as-is"
  fi
done

# exec command (default /bin/sh) so container remains interactive unless overridden

exec "$@"

systemctl start zebra
systemctl start ospfd
/root/sleep.sh

