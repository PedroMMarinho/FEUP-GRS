# 1 - OSPF Neighbor Analysis

Using the command (`show ip ospf neighbor`) in the routers log the result:

| Router | Neighbor Router | State | Interface | Dead Time |
|---|---|---|---|---|
| router1 | 172.16.123.142 | Full/Backup | eth0:10.0.1.2 | 33.161 sec |
| router2 | 172.16.123.142 | Full/Backup | eth0:10.0.1.18 | 39.723 sec | 
| router3 | 172.31.255.253; 172.16.123.158| Full/DR; Full/DR | eth0:10.0.1.3; eth1:10.0.1.19 | 35.066; 35.107 sec |

---

# 2 - OSPF Routing Table

Run on each router:

`show ip route ospf`

## Routing Table Results

| Router | Learned Network | Next Hop | Metric |
|---|---|---|---|
| router1 | 10.0.1.16/29; 172.16.123.128/28; 172.16.123.144/28 | 10.0.1.3 (all share the same) | 20; 20; 30|
| router2 | 10.0.1.0/29; 172.16.123.128/28; 172.31.255.0/24; 0.0.0.0/0| 10.0.1.19 (all share the same)| 20;20;30;10 |
| router3 | 0.0.0.0/0; 10.0.1.8/29; 172.16.123.144/28; 172.31.255.0/24| 10.0.1.2; 10.0.1.2 or 10.0.1.18; 10.0.1.18; 10.0.1.2| 10;20;20;20|

# 3 - Connectivity Test

From **org1_server1 ping the other server**

## Ping Results

| Metric | Value |
|---|---|
| Packets transmitted | 10 |
| Packets received | 10 |
| Packet loss | 0% |
| Average RTT | 0.442 ms|

---
# TODO
# 4 - OSPF Convergence Experiment 

Simulate a failure.

Stop **router2**:

`docker stop org1_router2`

## Measure Convergence Time

Record time when failure occurs.

Monitor routes:

`show ip route`

Ping continuously from **server1**:

`ping 172.16.123.146`

## Convergence Results

| Event | Time |
|---|---|
| Router failure detected | yes |
| Routing table updated | yes |
| Connectivity restored | no |

Convergence Time = ______ seconds

# 5 - OSPF Database Analysis

Run:

`show ip ospf database`

## LSDB Results

| LSA Type | Advertising Router | Age |
|---|---|---|
| Router LSA | | |
| Network LSA | | |