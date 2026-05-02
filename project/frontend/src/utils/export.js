// Converts the React Flow graph state into the topology JSON consumed by the backend.
import { toPng } from 'html-to-image';
import { getRectOfNodes, getTransformForBounds } from 'reactflow';

export function buildTopology(nodes, edges) {
  const networkNodes = nodes.filter((n) => n.type === 'networkNode');
  const deviceNodes  = nodes.filter((n) => n.type !== 'networkNode');
 
  // Visual membership — which NetworkNode box is this device sitting inside?
  const visualMembershipMap = {};
  deviceNodes.forEach((device) => {
    if (device.parentNode) visualMembershipMap[device.id] = device.parentNode;
  });
 
  // Each device's network list = NetworkNode(s) it visually lives inside
  const deviceNetworksMap = {};
  deviceNodes.forEach((node) => {
    deviceNetworksMap[node.id] = new Set();
    if (visualMembershipMap[node.id]) {
      deviceNetworksMap[node.id].add(visualMembershipMap[node.id]);
    }
  });

  const cidrToMask = (bits) => {
    const b = parseInt(bits, 10);
    return [0,1,2,3].map((i) => 256 - Math.pow(2, 8 - Math.min(8, Math.max(0, b - i * 8)))).join('.');
  };
 
  const topology = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    networks: networkNodes.map((net) => ({
      id: net.id,
      config: net.data?.config || {},
      members: deviceNodes
        .filter((d) => deviceNetworksMap[d.id].has(net.id))
        .map((d) => d.id),
    })),
    devices: deviceNodes.map((node) => {
      const baseConfig = { ...(node.data?.config || {}) };
      const networkIds = Array.from(deviceNetworksMap[node.id]);
 
      // Router interfaces come from its own config (written by ConfigSidebar)
      // keyed by connected node id — no derivation needed here
      if (node.data?.type === 'router') {
        const interfaces = baseConfig.interfaces || {};
        const firstIp = Object.values(interfaces).find((i) => i?.ip)?.ip || null;
        if (firstIp) baseConfig.ip_address = firstIp;
      } else {
        // For non-routers inside a NetworkNode, inject gateway + subnet_mask
        // from the parent network config if not already explicitly set by the user
        const parentNetId = visualMembershipMap[node.id];
        if (parentNetId) {
          const parentNet = networkNodes.find((n) => n.id === parentNetId);
          const netCfg = parentNet?.data?.config || {};
          if (!baseConfig.gateway && netCfg.gateway)
            baseConfig.gateway = netCfg.gateway;
          if (!baseConfig.subnet_mask && netCfg.mask)
            baseConfig.subnet_mask = cidrToMask(netCfg.mask);
        }
      }
 
      return {
        id:       node.id,
        type:     node.data?.type,
        config:   baseConfig,
        networks: networkIds,
      };
    }),
    links: edges
      // Exclude any edge that touches a networkNode (they have no handles now)
      .filter((e) => {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        return src?.type !== 'networkNode' && tgt?.type !== 'networkNode';
      })
      .map((e) => ({
        source:       e.source,
        target:       e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
      })),
  };
 
  return topology;
}
 
export function importTopology(topology) {
  const nodes = [];
  const edges = [];
 
  const NET_WIDTH  = 300;
  const NET_HEIGHT = 220;
  const NET_GAP    = 80;
 
  topology.networks.forEach((net, i) => {
    nodes.push({
      id:   net.id,
      type: 'networkNode',
      position: { x: i * (NET_WIDTH + NET_GAP) + 60, y: 80 },
      style: { width: NET_WIDTH, height: NET_HEIGHT },
      data: { type: 'network', config: net.config || {} },
    });
  });
 
  const networkPositions = {};
  nodes.forEach((n) => { if (n.type === 'networkNode') networkPositions[n.id] = n.position; });
 
  const childCounters = {};
 
  topology.devices.forEach((device) => {
    const isRouter = device.type === 'router';
    const netIds   = device.networks || [];
 
    if (isRouter) {
      const connectedPositions = netIds.map((id) => networkPositions[id]).filter(Boolean);
      let x = 200, y = 380;
      if (connectedPositions.length > 0) {
        x = connectedPositions.reduce((sum, p) => sum + p.x, 0) / connectedPositions.length + NET_WIDTH / 2 - 80;
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
          id: device.id, type: 'deviceNode',
          parentNode: parentId, extent: 'parent',
          position: { x: 20 + (idx % 2) * 130, y: 50 + Math.floor(idx / 2) * 70 },
          data: { type: device.type, config: device.config || {} },
        });
      } else {
        nodes.push({
          id: device.id, type: 'deviceNode',
          position: { x: 100 + Math.random() * 200, y: 400 },
          data: { type: device.type, config: device.config || {} },
        });
      }
    }
  });
 
  topology.links.forEach((link, i) => {
    edges.push({
      id: `e-${link.source}-${link.target}-${i}`,
      source: link.source, target: link.target,
      sourceHandle: link.sourceHandle || null, targetHandle: link.targetHandle || null,
      animated: false, style: { stroke: '#2d3348', strokeWidth: 2 },
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

export function downloadPNG(reactFlowInstance, backgroundColor) {
  // Target the viewport specifically so we can manipulate the transform matrix
  const viewportElement = document.querySelector('.react-flow__viewport');

  if (!viewportElement || !reactFlowInstance) {
    console.error("Could not find the React Flow canvas to export.");
    return;
  }

  const nodes = reactFlowInstance.getNodes();
  if (nodes.length === 0) return;

  // 1. Calculate the bounding box of all nodes
  const nodesBounds = getRectOfNodes(nodes);

  // 2. Add some padding around the edges
  const padding = 50;
  const imageWidth = nodesBounds.width + padding * 2;
  const imageHeight = nodesBounds.height + padding * 2;

  // 3. Calculate the perfect transform to fit everything (returns [x, y, zoom])
  const transform = getTransformForBounds(
    nodesBounds,
    imageWidth,
    imageHeight,
    0.5, // min zoom
    2    // max zoom
  );

  toPng(viewportElement, {
    backgroundColor: backgroundColor,
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      // 4. Temporarily force the viewport to perfectly frame the schema during export!
      transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
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