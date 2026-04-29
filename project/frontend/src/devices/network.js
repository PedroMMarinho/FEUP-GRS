// Network nodes are rendered as resizable background groups.
// Devices dragged inside them are considered "members" of that subnet.

import networkIcon from '../assets/network.svg';

const network = {
  type: 'network',
  label: 'Network',
  // color is used for the translucent fill and border of the group area
  color: '#7c3aed',
  textColor: '#ffffff',
  icon: `<img src="${networkIcon}" style="width: 100%; height: 100%; object-fit: contain;" alt="Network" />`,
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