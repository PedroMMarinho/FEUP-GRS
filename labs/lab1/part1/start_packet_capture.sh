#!/bin/bash

# Can be eth0 or eth1 either one works 
interface=$1

FILENAME="server_traffic_${interface}.pcap"

CONTAINER_PATH="/traffic-captures/${FILENAME}"

echo "Starting packet capture on router interface ${interface}..."
echo "Saving to local folder: ./traffic-captures/${FILENAME}"
echo "Press [Ctrl+C] to stop sniffing."
echo "---------------------------------------------------"

docker exec router tcpdump -i "${interface}" -w "${CONTAINER_PATH}"