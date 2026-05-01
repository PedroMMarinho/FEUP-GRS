// Converts the React Flow graph state into the topology JSON consumed by the backend.
import { toPng } from 'html-to-image';
/**
 * Builds a serializable topology object from nodes and edges.
 * Network nodes that contain other nodes are represented with a `members` array.
 */
export function buildTopology(nodes, edges) {
  const networkNodes = nodes.filter((n) => n.type === 'networkNode');
  const deviceNodes = nodes.filter((n) => n.type !== 'networkNode');

  // 1. Map visual membership (Which network box is this device sitting inside?)
  const visualMembershipMap = {}; 
  deviceNodes.forEach((device) => {
    if (device.parentNode) {
      visualMembershipMap[device.id] = device.parentNode;
    }
  });

  // 2. Track ALL networks a device belongs to (using a Set to prevent duplicates)
  const deviceNetworksMap = {};
  deviceNodes.forEach((node) => {
    deviceNetworksMap[node.id] = new Set();
    if (visualMembershipMap[node.id]) {
      deviceNetworksMap[node.id].add(visualMembershipMap[node.id]);
    }
  });

  // 3. Trace the edges! Routers sit between networks. 
  // If a router connects to a device inside a network, the router is now part of that network.
  edges.forEach((edge) => {
    const sourceNet = visualMembershipMap[edge.source];
    const targetNet = visualMembershipMap[edge.target];
    const sourceNode = deviceNodes.find(n => n.id === edge.source);
    const targetNode = deviceNodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    // If source is a router and target is inside a network box, attach the router to that network
    if (sourceNode.data?.type === 'router' && targetNet) {
      deviceNetworksMap[sourceNode.id].add(targetNet);
    }
    // Vice versa: If target is a router and source is inside a network box
    if (targetNode.data?.type === 'router' && sourceNet) {
      deviceNetworksMap[targetNode.id].add(sourceNet);
    }
  });

  // Helper: look up a network node by id
  const netById = (id) => networkNodes.find((n) => n.id === id);

  const topology = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    networks: networkNodes.map((net) => ({
      id: net.id,
      config: net.data?.config || {},
      // Include any device that considers this network as one of its networks
      members: deviceNodes
        .filter((d) => deviceNetworksMap[d.id].has(net.id))
        .map((d) => d.id),
    })),

    devices: deviceNodes.map((node) => {
      const baseConfig = { ...(node.data?.config || {}) };
      const networkIds = Array.from(deviceNetworksMap[node.id]);
 
      // For routers: build an `interfaces` map  { <network_id>: { ip, subnet, mask } }
      // sourced from each connected network's gateway/subnet/mask config.
      if (node.data?.type === 'router') {
        const interfaces = {};
        networkIds.forEach((netId) => {
          const net = netById(netId);
          const cfg = net?.data?.config || {};
          interfaces[netId] = {
            ip:     cfg.gateway || null,
            subnet: cfg.subnet  || null,
            mask:   cfg.mask    || null,
          };
        });
 
        // ip_address = first interface's gateway (keeps backend happy for single-IP use)
        const firstIp = Object.values(interfaces).find((i) => i.ip)?.ip || null;
        if (firstIp) baseConfig.ip_address = firstIp;
 
        baseConfig.interfaces = interfaces;
      }
 
      return {
        id:       node.id,
        type:     node.data?.type,
        config:   baseConfig,
        networks: networkIds,
      };
    }),

    links: edges.map((e) => ({
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    })),
  };

  return topology;
}

export function downloadJSON(topology) {
  const blob = new Blob([JSON.stringify(topology, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vno-topology-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPNG(backgroundColor) {
  const flowElement = document.querySelector('.react-flow');

  if (!flowElement) {
    console.error("Could not find the React Flow canvas to export.");
    return;
  }

  toPng(flowElement, {
    backgroundColor: backgroundColor, 
    filter: (node) => {
      if (
        node?.classList?.contains('react-flow__minimap') ||
        node?.classList?.contains('react-flow__controls')
      ) {
        return false;
      }
      return true;
    },
  })
    .then((dataUrl) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `netcompose-topology-${Date.now()}.png`;
      a.click();
    })
    .catch((err) => {
      console.error('Failed to export PNG', err);
    });
}