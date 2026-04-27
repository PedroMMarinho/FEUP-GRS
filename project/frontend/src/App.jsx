import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import DeviceNode from './nodes/DeviceNode';
import NetworkNode from './nodes/NetworkNode';
import Toolbar from './components/Toolbar';
import ConfigSidebar from './components/ConfigSidebar';
import { buildTopology, downloadJSON } from './utils/export';
import { EXAMPLE_NODES, EXAMPLE_EDGES } from './utils/exampleTopology';

// Register custom node types once (outside component to avoid re-creation)
const NODE_TYPES = {
  deviceNode: DeviceNode,
  networkNode: NetworkNode,
};

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // React Flow change handlers
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: false, style: { stroke: '#2d3348', strokeWidth: 2 } }, eds)), []);

  const onNodeClick = useCallback((_, node) => setSelectedNodeId(node.id), []);
  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  // Derive selectedNode from id so it's always fresh after config edits
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // Add a new node to the canvas
  const handleAdd = useCallback((type) => {
    const id = `${type}_${Math.random().toString(36).substr(2, 5)}`;
    const isNetwork = type === 'network';

    const newNode = {
      id,
      type: isNetwork ? 'networkNode' : 'deviceNode',
      data: { type, config: {} },
      position: { x: 120 + Math.random() * 200, y: 80 + Math.random() * 150 },
      ...(isNetwork && { style: { width: 300, height: 220 } }),
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
  }, []);

  // Update a single config field on the selected node
  const handleConfigChange = useCallback((field, value) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, config: { ...node.data.config, [field]: value } } }
          : node
      )
    );
  }, [selectedNodeId]);

  // Delete selected node and its connected edges
  const handleDelete = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Load the pre-built example topology, replacing whatever is on the canvas
  const handleLoadExample = useCallback(() => {
    setNodes(EXAMPLE_NODES);
    setEdges(EXAMPLE_EDGES);
    setSelectedNodeId(null);
  }, []);

  // Build topology and trigger download
  const handleExport = useCallback(() => {
    const topology = buildTopology(nodes, edges);
    downloadJSON(topology);
  }, [nodes, edges]);

  return (
    <div style={styles.root}>
      <Toolbar onAdd={handleAdd} onExport={handleExport} onLoadExample={handleLoadExample} />

      <div style={styles.body}>
        {/* Canvas */}
        <div style={styles.canvas}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            deleteKeyCode="Delete"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e2438" gap={24} size={1} />
            <Controls style={controlsStyle} />
            <MiniMap
              style={minimapStyle}
              nodeColor={(n) => {
                const type = n.data?.type;
                const colorMap = { router: '#e05c2a', switch: '#2a7be0', host: '#2ab068', network: '#7c3aed' };
                return colorMap[type] || '#4a5568';
              }}
              maskColor="#0d111788"
            />
          </ReactFlow>

          {/* Empty state hint */}
          {nodes.length === 0 && (
            <div style={styles.emptyHint}>
              <div style={styles.emptyTitle}>Empty canvas</div>
              <div style={styles.emptyDesc}>Use the toolbar above to add devices and networks</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          <ConfigSidebar
            selectedNode={selectedNode}
            onConfigChange={handleConfigChange}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#080c14',
    fontFamily: "'DM Mono', 'Fira Mono', monospace",
  },
  body: {
    flexGrow: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvas: {
    flexGrow: 1,
    position: 'relative',
    background: '#0d1117',
  },
  sidebar: {
    width: 280,
    background: '#0a0e1a',
    borderLeft: '1px solid #1e2438',
    flexShrink: 0,
    overflowY: 'auto',
  },
  emptyHint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  emptyTitle: {
    color: '#2d3348',
    fontSize: 22,
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  emptyDesc: {
    color: '#1e2438',
    fontSize: 13,
    marginTop: 6,
    fontFamily: 'monospace',
  },
};

const controlsStyle = {
  background: '#131929',
  border: '1px solid #1e2438',
  borderRadius: 8,
};

const minimapStyle = {
  background: '#0d1117',
  border: '1px solid #1e2438',
  borderRadius: 8,
};