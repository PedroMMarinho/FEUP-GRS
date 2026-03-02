## Test, monitoring, reconfiguration

### Questions
- On which interface will you be doing the capture?
    - Either eth0 or eth1 because all packets (client to server and server to client) flow on both

- Can you use port mirroring in this setup?
    - Port mirroring happens in the layer 2 (Data link layer, OSI model), so we cannot because packages used in our routter do not give us access to layer 2 packets ???