// Pre-built example topology: two subnets connected through a router.
//
//  [net-a: 10.0.1.0/24]          [net-b: 10.0.2.0/24]
//    host-a1  host-a2               host-b1
//       └──────┘                      │
//           sw-a ──── router ──── sw-b

export const EXAMPLE_NODES = [
  // ── Network A ────────────────────────────────────────────────────
  {
    id: 'net_a',
    type: 'networkNode',
    data: {
      type: 'network',
      config: {
        subnet: '10.0.1.0',
        mask: '24',
        gateway: '10.0.1.1',
        dhcp_enabled: true,
        dhcp_start: '10.0.1.100',
        dhcp_end: '10.0.1.200',
      },
    },
    position: { x: 60, y: 60 },
    style: { width: 360, height: 260 },
  },
  {
    id: 'host_a1',
    type: 'deviceNode',
    data: {
      type: 'host',
      config: { hostname: 'host-a1', ip_address: '10.0.1.10', subnet_mask: '255.255.255.0', gateway: '10.0.1.1' },
    },
    position: { x: 40, y: 80 },
    parentNode: 'net_a',
    extent: 'parent',
  },
  {
    id: 'host_a2',
    type: 'deviceNode',
    data: {
      type: 'host',
      config: { hostname: 'host-a2', ip_address: '10.0.1.11', subnet_mask: '255.255.255.0', gateway: '10.0.1.1' },
    },
    position: { x: 200, y: 80 },
    parentNode: 'net_a',
    extent: 'parent',
  },
  {
    id: 'sw_a',
    type: 'deviceNode',
    data: {
      type: 'switch',
      config: { hostname: 'sw-a', vlan_id: '10', port_count: '8' },
    },
    position: { x: 120, y: 180 },
    parentNode: 'net_a',
    extent: 'parent',
  },

  // ── Router (between the two subnets) ─────────────────────────────
  {
    id: 'router_core',
    type: 'deviceNode',
    data: {
      type: 'router',
      config: {
        hostname: 'core-router',
        ip_address: '10.0.1.1',
        ospf_enabled: true,
        ospf_area: '0.0.0.0',
        nat_enabled: true,
      },
    },
    position: { x: 520, y: 200 },
  },

  // ── Network B ────────────────────────────────────────────────────
  {
    id: 'net_b',
    type: 'networkNode',
    data: {
      type: 'network',
      config: {
        subnet: '10.0.2.0',
        mask: '24',
        gateway: '10.0.2.1',
        dhcp_enabled: false,
      },
    },
    position: { x: 720, y: 60 },
    style: { width: 300, height: 260 },
  },
  {
    id: 'host_b1',
    type: 'deviceNode',
    data: {
      type: 'host',
      config: { hostname: 'host-b1', ip_address: '10.0.2.10', subnet_mask: '255.255.255.0', gateway: '10.0.2.1' },
    },
    position: { x: 80, y: 60 },
    parentNode: 'net_b',
    extent: 'parent',
  },
  {
    id: 'sw_b',
    type: 'deviceNode',
    data: {
      type: 'switch',
      config: { hostname: 'sw-b', vlan_id: '20', port_count: '8' },
    },
    position: { x: 80, y: 170 },
    parentNode: 'net_b',
    extent: 'parent',
  },
];

export const EXAMPLE_EDGES = [
  { id: 'e_ha1_swa', source: 'host_a1', target: 'sw_a', style: { stroke: '#2d3348', strokeWidth: 2 } },
  { id: 'e_ha2_swa', source: 'host_a2', target: 'sw_a', style: { stroke: '#2d3348', strokeWidth: 2 } },
  { id: 'e_swa_router', source: 'sw_a', target: 'router_core', style: { stroke: '#2d3348', strokeWidth: 2 } },
  { id: 'e_router_swb', source: 'router_core', target: 'sw_b', style: { stroke: '#2d3348', strokeWidth: 2 } },
  { id: 'e_swb_hb1', source: 'sw_b', target: 'host_b1', style: { stroke: '#2d3348', strokeWidth: 2 } },
];
