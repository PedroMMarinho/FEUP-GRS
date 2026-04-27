// Each device file exports a single definition object.
// To add a new device: copy this file, change the values, and import it in devices/index.js

const router = {
  type: 'router',
  label: 'Router',
  color: '#e05c2a',          // accent color used for icon bg, border highlights
  textColor: '#ffffff',
  icon: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="9" width="20" height="6" rx="1"/>
      <line x1="6" y1="12" x2="6" y2="12.01"/>
      <line x1="10" y1="12" x2="10" y2="12.01"/>
      <line x1="14" y1="7" x2="14" y2="9"/>
      <line x1="14" y1="15" x2="14" y2="17"/>
    </svg>
  `,

  // Configuration fields shown in the sidebar when this node is selected.
  // type: 'text' | 'select' | 'checkbox'
  configFields: [
    {
      key: 'hostname',
      label: 'Hostname',
      type: 'text',
      placeholder: 'router-01',
      required: true,
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      type: 'text',
      placeholder: '10.0.0.1',
      required: true,
    },
    {
      key: 'subnet_mask',
      label: 'Subnet Mask',
      type: 'text',
      placeholder: '255.255.255.0',
    },
    {
      key: 'ospf_enabled',
      label: 'Enable OSPF',
      type: 'checkbox',
    },
    {
      key: 'ospf_area',
      label: 'OSPF Area',
      type: 'text',
      placeholder: '0.0.0.0',
      dependsOn: { key: 'ospf_enabled', value: true },
    },
    {
      key: 'ospf_cost',
      label: 'OSPF Cost',
      type: 'text',
      placeholder: '1',
      dependsOn: { key: 'ospf_enabled', value: true },
    },
    {
      key: 'nat_enabled',
      label: 'Enable NAT',
      type: 'checkbox',
    },
  ],
};

export default router;