// Converts the React Flow graph state into the topology JSON consumed by the backend.
import { toPng } from 'html-to-image';
/**
 * Builds a serializable topology object from nodes and edges.
 * Network nodes that contain other nodes are represented with a `members` array.
 */
export function buildTopology(nodes, edges) {
  // Identify which device nodes are visually inside a network group
  const networkNodes = nodes.filter((n) => n.type === 'networkNode');
  const deviceNodes = nodes.filter((n) => n.type !== 'networkNode');

  const membershipMap = {}; // nodeId -> networkId
  deviceNodes.forEach((device) => {
    if (device.parentNode) {
      membershipMap[device.id] = device.parentNode;
    }
  });

  const topology = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    networks: networkNodes.map((net) => ({
      id: net.id,
      config: net.data.config || {},
      members: deviceNodes
        .filter((d) => membershipMap[d.id] === net.id)
        .map((d) => d.id),
    })),
    devices: deviceNodes.map((node) => ({
      id: node.id,
      type: node.data.type,
      config: node.data.config || {},
      network: membershipMap[node.id] || null,
    })),
    links: edges.map((e) => ({
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    })),
  };

  return topology;
}

/** Triggers a JSON file download in the browser. */
export function downloadJSON(topology) {
  const blob = new Blob([JSON.stringify(topology, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `netcompose-topology-${Date.now()}.json`;
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