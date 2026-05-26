import dnsIcon from '../assets/server.svg';

const dnsServer = {
  type: 'dns_server',
  label: 'DNS Server',
  color: '#8b5cf6',
  textColor: '#ffffff',
  icon: `<img src="${dnsIcon}" style="width: 100%; height: 100%; object-fit: contain;" alt="DNS Server" />`,

  configFields: [
    {
      key: 'hostname',
      label: 'Hostname',
      type: 'text',
      placeholder: 'dns-01',
      required: true,
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      type: 'text',
      placeholder: '10.0.1.53',
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
      placeholder: '10.0.1.250',
    },
    {
      key: 'domain',
      label: 'DNS Zone / Domain',
      type: 'text',
      placeholder: 'local',
    },
  ],
};

export default dnsServer;