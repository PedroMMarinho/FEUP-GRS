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
import DeviceSidebar from './components/DeviceSidebar';
import { buildTopology, downloadJSON } from './utils/export';
import { EXAMPLE_NODES, EXAMPLE_EDGES } from './utils/exampleTopology';

// Register custom node types once
const NODE_TYPES = {
  deviceNode: DeviceNode,
  networkNode: NetworkNode,
};

// Define our color palettes for Light/Dark mode
const themes = {
  dark: {
    rootBg: '#080c14',
    canvasBg: '#0d1117',
    sidebarBg: '#0a0e1a',
    borderColor: '#1e2438',
    edgeColor: '#2d3348',
    emptyTitle: '#2d3348',
    emptyDesc: '#1e2438',
    controlsBg: '#131929',
    minimapMask: '#0d111788',
    textMain: '#f8fafc', // Crisp white
    textMuted: '#64748b', // Slate grey
    accentBg: '#f8fafc', // White button in dark mode
    accentText: '#0f172a', // Dark text on white button
    accentMain: '#22c55e', // Terminal Green
    accentHover: '#16a34a', // Slightly darker green for hover states
  },
  light: {
    rootBg: '#f8fafc',
    canvasBg: '#ffffff',
    sidebarBg: '#f1f5f9',
    borderColor: '#e2e8f0',
    edgeColor: '#94a3b8',
    emptyTitle: '#94a3b8',
    emptyDesc: '#cbd5e1',
    controlsBg: '#ffffff',
    minimapMask: '#ffffff88',
    textMain: '#0f172a', // Near black
    textMuted: '#94a3b8', // Light slate
    accentBg: '#0f172a', // Dark button in light mode
    accentText: '#f8fafc', // White text on dark button
    accentMain: '#16a34a', // Slightly darker for light mode contrast
    accentHover: '#15803d',
  }
};

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const theme = isDarkMode ? themes.dark : themes.light;

  const [leftPanelWidth, setLeftPanelWidth] = useState(220);
  const [isDragging, setIsDragging] = useState(false);

  const startResizing = React.useCallback(() => setIsDragging(true), []);
  const stopResizing = React.useCallback(() => setIsDragging(false), []);

  const resize = React.useCallback((mouseMoveEvent) => {
    if (isDragging) {
      let newWidth = mouseMoveEvent.clientX;
      if (newWidth > 400) newWidth = 400; // Max width limit
      setLeftPanelWidth(newWidth);
    }
  }, [isDragging]);

  React.useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // React Flow change handlers
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  // Updated to use dynamic theme color for new edges
  const onConnect = useCallback((params) => setEdges((eds) => 
    addEdge({ ...params, animated: false, style: { stroke: theme.edgeColor, strokeWidth: 2 } }, eds)
  ), [theme]);

  const onNodeClick = useCallback((_, node) => setSelectedNodeId(node.id), []);
  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

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

  const handleConfigChange = useCallback((field, value) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, config: { ...node.data.config, [field]: value } } }
          : node
      )
    );
  }, [selectedNodeId]);

  const handleDelete = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  const handleLoadExample = useCallback(() => {
    setNodes(EXAMPLE_NODES);
    setEdges(EXAMPLE_EDGES);
    setSelectedNodeId(null);
  }, []);

  const handleExport = useCallback(() => {
    const topology = buildTopology(nodes, edges);
    downloadJSON(topology);
  }, [nodes, edges]);

  // Dynamic Styles Object based on current theme
  const dynamicStyles = {
    root: {
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: theme.rootBg,
      fontFamily: "'DM Mono', 'Fira Mono', monospace",
      transition: 'background 0.3s ease',
    },
    body: {
      flexGrow: 1,
      display: 'flex',
      overflow: 'hidden',
      userSelect: isDragging ? 'none' : 'auto',
    },
    canvas: {
      flexGrow: 1,
      position: 'relative',
      background: theme.canvasBg,
      transition: 'background 0.3s ease',
    },
    sidebar: {
      width: 280,
      background: theme.sidebarBg,
      borderLeft: `1px solid ${theme.borderColor}`,
      flexShrink: 0,
      overflowY: 'auto',
      transition: 'background 0.3s ease, border-color 0.3s ease',
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
      color: theme.emptyTitle,
      fontSize: 22,
      fontWeight: 700,
      fontFamily: 'monospace',
    },
    emptyDesc: {
      color: theme.emptyDesc,
      fontSize: 13,
      marginTop: 6,
      fontFamily: 'monospace',
    },
    themeToggle: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      zIndex: 10,
      padding: '8px 12px',
      background: theme.controlsBg,
      border: `1px solid ${theme.borderColor}`,
      color: isDarkMode ? '#fff' : '#000',
      borderRadius: 8,
      cursor: 'pointer',
      fontFamily: 'monospace',
    },
    leftSidebar: {
      width: leftPanelWidth,
      background: theme.sidebarBg,
      borderRight: leftPanelWidth > 0 ? `1px solid ${theme.borderColor}` : 'none', 
      flexShrink: 0,
      position: 'relative', 
      display: 'flex',
      overflow: 'visible', 
      transition: isDragging ? 'none' : 'width 0.2s ease', 
    },
    resizer: {
      position: 'absolute',
      right: -4, 
      top: 0,
      bottom: 0,
      width: 8, 
      cursor: 'col-resize', 
      background: isDragging ? theme.accentMain : 'transparent', // <--- The Terminal Green is back!
      zIndex: 10,
      transition: 'background 0.2s ease',
    },
  };

  return (
    <div style={dynamicStyles.root}>
      <Toolbar 
      onAdd={handleAdd} 
      onExport={handleExport} 
      onLoadExample={handleLoadExample}
      isDarkMode={isDarkMode}
      toggleTheme={() => setIsDarkMode(!isDarkMode)}
      theme={theme}
    />

      <div style={dynamicStyles.body}>
        
        {/* --- LEFT PANEL --- */}
        <div style={dynamicStyles.leftSidebar}>
          {/* Removed minWidth so it safely shrinks to 0 without spilling out */}
          <div style={{ width: '100%', flexShrink: 0, height: '100%', overflow: 'hidden' }}>
            <DeviceSidebar onAdd={handleAdd} theme={theme} />
          </div>
          
          {/* THE DRAG HANDLE */}
          <div 
            style={dynamicStyles.resizer} 
            onMouseDown={startResizing} 
          />
        </div>


        {/* Canvas */}
        <div style={dynamicStyles.canvas}>

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
            <Background color={theme.textMuted} gap={24} size={1.2} />
            
            <Controls 
              position="bottom-left" 
              style={{ 
                left: 15, 
                background: theme.controlsBg, 
                border: `1px solid ${theme.borderColor}`, 
                borderRadius: 8, 
                overflow: 'hidden' 
              }} 
            />
            
            <MiniMap
              style={{ background: theme.canvasBg, border: `1px solid ${theme.borderColor}`, borderRadius: 8, overflow: 'hidden' }}
              nodeColor={(n) => {
                const type = n.data?.type;
                const colorMap = { router: '#e05c2a', switch: '#2a7be0', host: '#2ab068', network: '#7c3aed' };
                return colorMap[type] || theme.borderColor;
              }}
              maskColor={theme.minimapMask}
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <div style={dynamicStyles.emptyHint}>
              <div style={dynamicStyles.emptyTitle}>Empty canvas</div>
              <div style={dynamicStyles.emptyDesc}>Use the toolbar above to add devices and networks</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={dynamicStyles.sidebar}>
          <ConfigSidebar
            selectedNode={selectedNode}
            onConfigChange={handleConfigChange}
            onDelete={handleDelete}
            // You might want to pass isDarkMode here so the sidebar components match!
            isDarkMode={isDarkMode} 
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}