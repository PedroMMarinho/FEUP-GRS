// Network nodes are rendered as resizable background groups.
// Devices dragged inside them are considered "members" of that subnet.
const network = {
  type: 'network',
  label: 'Network',
  // color is used for the translucent fill and border of the group area
  color: '#7c3aed',
  textColor: '#ffffff',
  icon: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="12" cy="12" rx="10" ry="4"/>
      <path d="M2 12c0 4.418 4.477 8 10 8s10-3.582 10-8"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  `,

  configFields: [
    {
      key: 'subnet',
      label: 'Subnet',
      type: 'text',
      placeholder: '10.0.0.0',
      required: true,
    },
    {
      key: 'mask',
      label: 'CIDR / Mask',
      type: 'text',
      placeholder: '24',
    },
    {
      key: 'dhcp_enabled',
      label: 'DHCP Server',
      type: 'checkbox',
    },
    {
      key: 'dhcp_start',
      label: 'DHCP Range Start',
      type: 'text',
      placeholder: '10.0.0.100',
      dependsOn: { key: 'dhcp_enabled', value: true },
    },
    {
      key: 'dhcp_end',
      label: 'DHCP Range End',
      type: 'text',
      placeholder: '10.0.0.200',
      dependsOn: { key: 'dhcp_enabled', value: true },
    },
    {
      key: 'gateway',
      label: 'Gateway',
      type: 'text',
      placeholder: '10.0.0.1',
    },
  ],
};

export default network;