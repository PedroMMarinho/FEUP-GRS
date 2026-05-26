import serverIcon from '../assets/server.svg';

const server = {
  type: 'server',
  label: 'Server',
  color: '#8C2D19',
  textColor: '#ffffff',
  icon: `<img src="${serverIcon}" style="width: 100%; height: 100%; object-fit: contain;" alt="Server" />`,

  configFields: [
    {
      key: 'hostname',
      label: 'Hostname',
      type: 'text',
      placeholder: 'server-01',
      required: true,
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      type: 'text',
      placeholder: '10.0.1.20',
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
      label: 'Domain',
      type: 'text',
      placeholder: 'server-01.local',
    },
    {
      key: 'port',
      label: 'HTTP Port',
      type: 'text',
      placeholder: '80',
    },
  ],
};

export default server;