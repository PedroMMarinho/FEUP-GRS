import switchIcon from '../assets/switch.svg';

const loadBalancer = {
  type: 'load_balancer',
  label: 'Load Balancer',
  color: '#f59e0b',
  textColor: '#ffffff',
  icon: `<img src="${switchIcon}" style="width: 100%; height: 100%; object-fit: contain;" alt="Load Balancer" />`,

  configFields: [
    {
      key: 'hostname',
      label: 'Hostname',
      type: 'text',
      placeholder: 'lb-01',
      required: true,
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      type: 'text',
      placeholder: '10.0.1.100',
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
      placeholder: 'app.local',
      required: true,
    },
    {
      key: 'port',
      label: 'Listen Port',
      type: 'text',
      placeholder: '80',
    },
    {
      key: 'algorithm',
      label: 'Algorithm',
      type: 'select',
      options: ['round_robin', 'least_conn', 'ip_hash'],
    }
  ],
};

export default loadBalancer;