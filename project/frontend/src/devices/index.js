// Central registry. To add a new device type:
// 1. Create devices/mydevice.js following the same schema
// 2. Import and add it to this array — nothing else needs to change.

import router from './router';
import switchDef from './switch';
import host from './host';
import network from './network';

const DEVICES = [router, switchDef, host, network];

// Keyed map for O(1) lookup by type string
export const DEVICE_MAP = Object.fromEntries(DEVICES.map((d) => [d.type, d]));

export default DEVICES;