// Pre-built example topology:
// Three LANs connected through three routers and two router-to-router transit networks.
//
//   [network_dfnu6: 10.0.1.0/24]
//      host-02 ── sw-01 ── router-01
//                              │
//   [network_2ftd6: 10.0.2.0/24]
//      host-04 ──┐
//                 sw-02 ───────┘
//      host-05 ──┘
//
//   router-01 ── 10.255.0.0/29 ── router-02 ── 10.255.0.8/29 ── router-03
//
//   [network_p5rnl: 10.0.3.0/24]
//      router-03 ── host-03

export const EXAMPLE_NODES = [
  // ── Network 1 ────────────────────────────────────────────────────
  {
    id: 'network_dfnu6',
    type: 'networkNode',
    data: {
      type: 'network',
      config: {
        subnet: '10.0.1.0',
        mask: '24',
        gateway: '10.0.1.250',
      },
    },
    position: { x: 60, y: 80 },
    style: { width: 340, height: 240 },
  },
  {
    id: 'switch_2f4nd',
    type: 'deviceNode',
    data: {
      type: 'switch',
      config: {
        hostname: 'sw-01',
        gateway: '10.0.1.250',
        subnet_mask: '255.255.255.0',
      },
    },
    position: { x: 120, y: 120 },
    parentNode: 'network_dfnu6',
    extent: 'parent',
  },
  {
    id: 'host_cpmgz',
    type: 'deviceNode',
    data: {
      type: 'host',
      config: {
        subnet_mask: '255.255.255.0',
        ip_address: '10.0.1.8',
        hostname: 'host-02',
        gateway: '10.0.1.250',
      },
    },
    position: { x: 120, y: 40 },
    parentNode: 'network_dfnu6',
    extent: 'parent',
  },

  // ── Network 2 ────────────────────────────────────────────────────
  {
    id: 'network_2ftd6',
    type: 'networkNode',
    data: {
      type: 'network',
      config: {
        subnet: '10.0.2.0',
        mask: '24',
        gateway: '10.0.2.250',
      },
    },
    position: { x: 60, y: 380 },
    style: { width: 380, height: 260 },
  },
  {
    id: 'switch_sxult',
    type: 'deviceNode',
    data: {
      type: 'switch',
      config: {
        hostname: 'sw-02',
        gateway: '10.0.2.250',
        subnet_mask: '255.255.255.0',
      },
    },
    position: { x: 130, y: 150 },
    parentNode: 'network_2ftd6',
    extent: 'parent',
  },
  {
    id: 'host_8v9d6',
    type: 'deviceNode',
    data: {
      type: 'host',
      config: {
        subnet_mask: '255.255.255.0',
        ip_address: '10.0.2.4',
        hostname: 'host-04',
        gateway: '10.0.2.250',
      },
    },
    position: { x: 40, y: 60 },
    parentNode: 'network_2ftd6',
    extent: 'parent',
  },
  {
    id: 'host_ds1b6',
    type: 'deviceNode',
    data: {
      type: 'host',
      config: {
        subnet_mask: '255.255.255.0',
        hostname: 'host-05',
        ip_address: '10.0.2.5',
        gateway: '10.0.2.250',
      },
    },
    position: { x: 210, y: 60 },
    parentNode: 'network_2ftd6',
    extent: 'parent',
  },

  // ── Routers ──────────────────────────────────────────────────────
  {
    id: 'router_sd9xx',
    type: 'routerNode',
    data: {
      type: 'router',
      config: {
        hostname: 'router-01',
        interfaces: {
          switch_2f4nd: {
            ip: '10.0.1.250',
            subnet: '10.0.1.0',
            mask: '24',
          },
          switch_sxult: {
            ip: '10.0.2.250',
            subnet: '10.0.2.0',
            mask: '24',
          },
          router_jj88e: {
            ip: '10.255.0.2',
            subnet: '10.255.0.0',
            mask: '29',
          },
        },
      },
    },
    position: { x: 560, y: 290 },
    style: { width: 160, height: 120 },
  },
  {
    id: 'router_jj88e',
    type: 'routerNode',
    data: {
      type: 'router',
      config: {
        hostname: 'router-02',
        interfaces: {
          router_sd9xx: {
            ip: '10.255.0.3',
            subnet: '10.255.0.0',
            mask: '29',
          },
          router_hna69: {
            ip: '10.255.0.10',
            subnet: '10.255.0.8',
            mask: '29',
          },
        },
      },
    },
    position: { x: 830, y: 290 },
    style: { width: 160, height: 120 },
  },
  {
    id: 'router_hna69',
    type: 'routerNode',
    data: {
      type: 'router',
      config: {
        hostname: 'router-03',
        interfaces: {
          router_jj88e: {
            ip: '10.255.0.11',
            subnet: '10.255.0.8',
            mask: '29',
          },
          host_t3osk: {
            ip: '10.0.3.250',
            subnet: '10.0.3.0',
            mask: '24',
          },
        },
      },
    },
    position: { x: 1100, y: 290 },
    style: { width: 160, height: 120 },
  },

  // ── Network 3 ────────────────────────────────────────────────────
  {
    id: 'network_p5rnl',
    type: 'networkNode',
    data: {
      type: 'network',
      config: {
        gateway: '10.0.3.250',
        subnet: '10.0.3.0',
        mask: '24',
      },
    },
    position: { x: 1320, y: 230 },
    style: { width: 300, height: 220 },
  },
  {
    id: 'host_t3osk',
    type: 'deviceNode',
    data: {
      type: 'host',
      config: {
        subnet_mask: '255.255.255.0',
        hostname: 'host-03',
        ip_address: '10.0.3.3',
        gateway: '10.0.3.250',
      },
    },
    position: { x: 80, y: 80 },
    parentNode: 'network_p5rnl',
    extent: 'parent',
  },
];

export const EXAMPLE_EDGES = [
  {
    id: 'e-router01-sw02',
    source: 'router_sd9xx',
    target: 'switch_sxult',
    sourceHandle: 'bottom',
    targetHandle: null,
    style: { stroke: '#2d3348', strokeWidth: 2 },
  },
  {
    id: 'e-sw02-host04',
    source: 'switch_sxult',
    target: 'host_8v9d6',
    sourceHandle: null,
    targetHandle: null,
    style: { stroke: '#2d3348', strokeWidth: 2 },
  },
  {
    id: 'e-sw02-host05',
    source: 'switch_sxult',
    target: 'host_ds1b6',
    sourceHandle: null,
    targetHandle: null,
    style: { stroke: '#2d3348', strokeWidth: 2 },
  },
  {
    id: 'e-router01-router02',
    source: 'router_sd9xx',
    target: 'router_jj88e',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    style: { stroke: '#2d3348', strokeWidth: 2 },
  },
  {
    id: 'e-router01-sw01',
    source: 'router_sd9xx',
    target: 'switch_2f4nd',
    sourceHandle: 'bottom',
    targetHandle: null,
    style: { stroke: '#2d3348', strokeWidth: 2 },
  },
  {
    id: 'e-sw01-host02',
    source: 'switch_2f4nd',
    target: 'host_cpmgz',
    sourceHandle: null,
    targetHandle: null,
    style: { stroke: '#2d3348', strokeWidth: 2 },
  },
  {
    id: 'e-router02-router03',
    source: 'router_jj88e',
    target: 'router_hna69',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    style: { stroke: '#2d3348', strokeWidth: 2 },
  },
  {
    id: 'e-router03-host03',
    source: 'router_hna69',
    target: 'host_t3osk',
    sourceHandle: 'bottom',
    targetHandle: null,
    style: { stroke: '#2d3348', strokeWidth: 2 },
  },
];