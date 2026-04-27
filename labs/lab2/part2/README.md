# Step 1 – Verify Initial Connectivity
From **org1_server1**, verify connectivity with **org2_server1**.

Command:

ping *172.16.123.18*
Record the following:

Initial ping response received?
YES / NO: YES

Average latency (ms): 0.479

### Step 2 – Monitor BGP State

On **org1_router1**, monitor the BGP neighbor state.

Command:

```
watch -n 1 "vtysh -c 'show ip bgp summary'"
```

Record the initial BGP neighbor state.

Neighbor IP: 172.31.255.252

Initial BGP state: 

☐ Established

### Step 3 – Simulate a BGP Failure

Stop the router container:

```
docker stop org2_router1
```

Observe the BGP state change.

Record:

Time when router stopped (HH:MM): 11:25 

Observed BGP state after failure:
☐ Connect  

Did the ping stop responding?

YES / NO: YES

### Step 4 – Restore the Router

Restart the router:

```
docker start org2_router1
```

Record the time when the router is restarted.

Restart time (HH:MM:SS): 11:25:00

### Step 5 – Measure BGP Convergence

Continue monitoring BGP on **org1_router1**.

Command:

```
show ip bgp summary
```

Record the time when the BGP session becomes **Established** again.

BGP Established time (HH:MM:SS): 11:25:17

### Step 6 – Calculate Convergence Time

Compute the convergence time.

Formula:

```
BGP Convergence Time = Established Time – Restart Time
```

Restart Time: 11:25:00

Established Time:  11:25:17

Calculated Convergence Time (seconds): 17

### Step 7 – Analysis

Answer the following questions.

###### 1. Why does BGP take longer to converge compared to OSPF?

Your answer: BGP is slower to converge because it prioritizes stability over speed at a massive scale. It relies on longer keepalive/hold timers and TCP connections, and must process vastly larger routing tables than OSPF's localized link-state database.

---

###### 2. What BGP states were observed during reconvergence?

Your answer: IDLE -> ACTIVE -> CONNECTED -> ESTABLISHED

---

###### 3. What could be done to reduce BGP convergence time?

Your answer: Have more connections between Org1 and Org2 AS (Removing the Single Point of Failure). Can also reduce the timeout of the BGp operations.