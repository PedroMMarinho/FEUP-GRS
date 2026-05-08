FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    iproute2 \
    iputils-ping \
    net-tools \
    tcpdump \
    curl \
    wget \
    iperf3 \
    nmap \
    dnsutils \
    traceroute \
    netcat \
    && rm -rf /var/lib/apt/lists/*

COPY init.sh /init.sh
RUN chmod +x /init.sh

CMD ["/init.sh"]
