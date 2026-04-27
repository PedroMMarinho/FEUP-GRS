const switchDef = {
  type: 'switch',
  label: 'Switch',
  color: '#2a7be0',
  textColor: '#ffffff',
  icon: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="8" width="20" height="8" rx="1"/>
      <line x1="6" y1="12" x2="6" y2="12.01"/>
      <line x1="10" y1="12" x2="10" y2="12.01"/>
      <line x1="6" y1="4" x2="6" y2="8"/>
      <line x1="10" y1="4" x2="10" y2="8"/>
      <line x1="14" y1="4" x2="14" y2="8"/>
      <line x1="18" y1="4" x2="18" y2="8"/>
      <line x1="6" y1="16" x2="6" y2="20"/>
      <line x1="10" y1="16" x2="10" y2="20"/>
      <line x1="14" y1="16" x2="14" y2="20"/>
      <line x1="18" y1="16" x2="18" y2="20"/>
    </svg>
  `,

  configFields: [
    {
      key: 'hostname',
      label: 'Hostname',
      type: 'text',
      placeholder: 'sw-01',
      required: true,
    },
    {
      key: 'vlan_id',
      label: 'VLAN ID',
      type: 'text',
      placeholder: '1',
    },
    {
      key: 'spanning_tree',
      label: 'Enable Spanning Tree (STP)',
      type: 'checkbox',
    },
    {
      key: 'stp_priority',
      label: 'STP Priority',
      type: 'text',
      placeholder: '32768',
      dependsOn: { key: 'spanning_tree', value: true },
    },
    {
      key: 'port_count',
      label: 'Port Count',
      type: 'select',
      options: ['8', '16', '24', '48'],
    },
  ],
};

export default switchDef;