FROM ubuntu:20.04
# baseline network tools
RUN apt update && apt install -y vim iproute2 iputils-ping tcpdump iptables dnsutils curl traceroute
# quagga
RUN apt update && apt install -y quagga systemctl expect
RUN apt update && apt install -y telnet
RUN mkdir -p /var/log/quagga
RUN chown quagga:quagga /var/log/quagga
RUN mkdir /run/quagga
RUN chmod a+w /run/quagga
COPY sleep.sh /root/sleep.sh
COPY start-ospf-bgp.sh /root/start-ospf-bgp.sh
COPY start-ospf.sh /root/start-ospf.sh
COPY start-bgp.sh /root/start-bgp.sh
COPY ospf.exp /root/ospf.exp
COPY zebra.exp /root/zebra.exp
COPY bgp.exp /root/bgp.exp
CMD /root/start-ospf.sh

