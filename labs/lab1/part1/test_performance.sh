#!/bin/bash

mkdir -p results

echo "Starting distributed benchmark across all 4 clients..."

i=1
for CLIENT_ID in $(docker ps -q -f name=client); do
    echo "Loading benchmark on client $i ($CLIENT_ID)..."

    docker exec $CLIENT_ID ab -n 1000 -c 20 http://10.0.2.100/ > ./results/client_${i}.txt 2>&1 &
    
    i=$((i+1))
done

echo "All clients firing! Waiting for them to finish..."
wait 

echo "Success! Check your ./results/ folder for client_1.txt through client_4.txt"