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