// Each device file exports a single definition object.
// To add a new device: copy this file, change the values, and import it in devices/index.js

import routerIcon from '../assets/router.svg';

const router = {
  type: 'router',
  label: 'Router',
  color: '#e05c2a',          // accent color used for icon bg, border highlights
  textColor: '#ffffff',
  icon: `<img src="${routerIcon}" style="width: 100%; height: 100%; object-fit: contain;" alt="Router" />`,

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