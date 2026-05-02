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


/**
 * Reconstructs React Flow nodes and edges from a topology JSON.
 * Networks become networkNodes with devices as children (parentNode).
 * Routers become standalone routerNodes.
 * Links become edges.
 */
export function importTopology(topology) {
  const nodes = [];
  const edges = [];
 
  const NET_WIDTH  = 300;
  const NET_HEIGHT = 220;
  const NET_GAP    = 80;
 
  // 1. Network nodes — placed side by side
  topology.networks.forEach((net, i) => {
    nodes.push({
      id:   net.id,
      type: 'networkNode',
      position: {
        x: i * (NET_WIDTH + NET_GAP) + 60,
        y: 80,
      },
      style: { width: NET_WIDTH, height: NET_HEIGHT },
      data: { type: 'network', config: net.config || {} },
    });
  });
 
  // 2. Device nodes
  const networkPositions = {};
  nodes.forEach((n) => {
    if (n.type === 'networkNode') networkPositions[n.id] = n.position;
  });
 
  const childCounters = {};
 
  topology.devices.forEach((device) => {
    const isRouter = device.type === 'router';
    const netIds   = device.networks || [];
 
    if (isRouter) {
      // Centre the router below the networks it connects
      const connectedPositions = netIds
        .map((id) => networkPositions[id])
        .filter(Boolean);
 
      let x = 200, y = 380;
      if (connectedPositions.length > 0) {
        x = connectedPositions.reduce((sum, p) => sum + p.x, 0) / connectedPositions.length
            + NET_WIDTH / 2 - 80;
        y = NET_HEIGHT + 160;
      }
 
      nodes.push({
        id:   device.id,
        type: 'routerNode',
        position: { x, y },
        style: { width: 160, height: 120 },
        data: { type: 'router', config: device.config || {} },
      });
    } else {
      const parentId = netIds[0];
 
      if (parentId && networkPositions[parentId] !== undefined) {
        const idx = childCounters[parentId] ?? 0;
        childCounters[parentId] = idx + 1;
 
        nodes.push({
          id:         device.id,
          type:       'deviceNode',
          parentNode: parentId,
          extent:     'parent',
          position: {
            x: 20 + (idx % 2) * 130,
            y: 50 + Math.floor(idx / 2) * 70,
          },
          data: { type: device.type, config: device.config || {} },
        });
      } else {
        nodes.push({
          id:   device.id,
          type: 'deviceNode',
          position: { x: 100 + Math.random() * 200, y: 400 },
          data: { type: device.type, config: device.config || {} },
        });
      }
    }
  });
 
  // 3. Edges from links
  topology.links.forEach((link, i) => {
    edges.push({
      id:           `e-${link.source}-${link.target}-${i}`,
      source:       link.source,
      target:       link.target,
      sourceHandle: link.sourceHandle || null,
      targetHandle: link.targetHandle || null,
      animated:     false,
      style:        { stroke: '#2d3348', strokeWidth: 2 },
    });
  });
 
  return { nodes, edges };
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