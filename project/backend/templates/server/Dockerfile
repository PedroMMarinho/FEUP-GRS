FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    iproute2 \
    iputils-ping \
    net-tools \
    tcpdump \
    curl \
    wget \
    traceroute \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY init.sh /init.sh
RUN chmod +x /init.sh

CMD ["/init.sh"]