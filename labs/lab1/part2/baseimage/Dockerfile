FROM ubuntu:20.04

RUN apt update && apt install -y vim iproute2 iputils-ping tcpdump iptables dnsutils curl apache2-utils w3m w3m-img

COPY generate_http_traffic.sh /root/generate_http_traffic.sh
