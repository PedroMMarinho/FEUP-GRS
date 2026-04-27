const host = {
  type: 'host',
  label: 'Host',
  color: '#2ab068',
  textColor: '#ffffff',
  icon: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  `,

  configFields: [
    {
      key: 'hostname',
      label: 'Hostname',
      type: 'text',
      placeholder: 'host-01',
      required: true,
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      type: 'text',
      placeholder: '10.0.0.10',
      required: true,
    },
    {
      key: 'subnet_mask',
      label: 'Subnet Mask',
      type: 'text',
      placeholder: '255.255.255.0',
    },
    {
      key: 'gateway',
      label: 'Default Gateway',
      type: 'text',
      placeholder: '10.0.0.1',
    },
    {
      key: 'dns',
      label: 'DNS Server',
      type: 'text',
      placeholder: '8.8.8.8',
    },
    {
      key: 'dhcp',
      label: 'Use DHCP',
      type: 'checkbox',
    },
  ],
};

export default host;