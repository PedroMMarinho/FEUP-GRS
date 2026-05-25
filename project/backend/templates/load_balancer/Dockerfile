FROM nginx:1.25

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

COPY nginx.conf /etc/nginx/nginx.conf
COPY init.sh /init.sh

RUN chmod +x /init.sh

CMD ["/init.sh"]