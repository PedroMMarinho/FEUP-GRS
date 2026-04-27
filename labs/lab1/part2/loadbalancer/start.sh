#!/bin/bash

#/sbin/ip route replace default via 10.0.2.254a
/sbin/ip route add 10.0.1.0/24 via 10.0.2.254
nginx -g "daemon off;"
