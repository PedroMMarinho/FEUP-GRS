import switchIcon from '../assets/switch.svg';

const switchDef = {
  type: 'switch',
  label: 'Switch',
  color: '#2a7be0',
  textColor: '#ffffff',
  icon: `<img src="${switchIcon}" style="width: 100%; height: 100%; object-fit: contain;" alt="Switch" />`,

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