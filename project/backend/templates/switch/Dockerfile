FROM ubuntu:20.04

RUN apt update && apt install -y \
    vim iproute2 iputils-ping tcpdump \
    bridge-utils \
    && rm -rf /var/lib/apt/lists/*

COPY init.sh /root/init.sh
RUN chmod +x /root/init.sh

CMD ["/root/init.sh"]