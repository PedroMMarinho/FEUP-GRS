FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    dnsmasq \
    iproute2 \
    iputils-ping \
    net-tools \
    tcpdump \
    curl \
    wget \
    traceroute \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

COPY dnsmasq.conf /etc/dnsmasq.conf
COPY init.sh /init.sh

RUN chmod +x /init.sh

CMD ["/init.sh"]