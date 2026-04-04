# Network DNS & Load Balancing Overview

## Concept
This setup uses a central DNS server to map domain names to specific IP addresses within the organization's network.

* **Load Balancer (Primary Entry Point):** All general traffic for `myorg.net` and `www.myorg.net` is pointed to the Load Balancer IP (`172.16.123.136`).
* **Direct Access:** Specific backend services (`www1`, `www2`, `www3`, `www4`) are mapped directly to their individual IPs to allow for maintenance and direct health checks.

## Infrastructure IPs
* **DNS Server:** `172.16.123.138`
* **Load Balancer:** `172.16.123.136`
* **Router:** `172.16.123.142`
* **Web Subnet:** `172.16.123.128/28`

## Testing Connectivity

### 1. Test DNS Resolution
Run these commands from the client container to ensure names translate correctly:
```bash
# Test the main site (should point to Load Balancer)
sudo docker exec part1-client-1 dig @172.16.123.138 www.myorg.net

# Test a specific backend node
sudo docker exec part1-client-1 dig @172.16.123.138 www1.myorg.net
```

### . Test Web Access
Verify that the client can successfully reach the web services over the network:
```bash
# Access the site via the Load Balancer
sudo docker exec part1-client-1 curl www.myorg.net

# Access a specific backend node directly
sudo docker exec part1-client-1 curl www1.myorg.net
```

### 3. Verify Reverse DNS
Ensure the network can translate IPs back into names:
```bash
sudo docker exec part1-client-1 dig @172.16.123.138 -x 172.16.123.136 # Place any of the IP
```