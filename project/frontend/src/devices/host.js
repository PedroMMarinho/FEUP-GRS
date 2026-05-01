import hostIcon from '../assets/host.svg';

const host = {
  type: 'host',
  label: 'Host',
  color: '#2ab068',
  textColor: '#ffffff',
  icon: `<img src="${hostIcon}" style="width: 100%; height: 100%; object-fit: contain;" alt="Host" />`,

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