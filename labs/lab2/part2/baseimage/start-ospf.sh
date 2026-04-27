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
  [172.16.123.142]=eth2
  [172.16.123.158]=eth2
  [172.31.255.252]=eth2
  [10.0.2.2]=eth0
  [10.0.2.10]=eth1
  [10.0.2.3]=eth0
  [10.0.2.19]=eth1
  [10.0.2.11]=eth0
  [10.0.2.18]=eth1
  [172.16.123.30]=eth2
  [172.16.123.14]=eth2

)



# exec command (default /bin/sh) so container remains interactive unless overridden

exec "$@"
systemctl start zebra
systemctl start ospfd
/root/sleep.sh

