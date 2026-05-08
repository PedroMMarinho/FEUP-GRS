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
import RouterNode from './nodes/RouterNode';
import Toolbar from './components/Toolbar';
import ConfigSidebar from './components/ConfigSidebar';
import DeviceSidebar from './components/DeviceSidebar';
import { EXAMPLE_NODES, EXAMPLE_EDGES } from './utils/exampleTopology';
import { buildTopology, downloadJSON, downloadPNG, importTopology } from './utils/export';

// Register custom node types once
const NODE_TYPES = {
  deviceNode: DeviceNode,
  networkNode: NetworkNode,
  routerNode: RouterNode,
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

const HOSTNAME_PREFIX = {
  host: 'host',
  switch: 'sw',
  router: 'router',
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function intToIpv4(num) {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

function addIpv4(ip, offset) {
  return intToIpv4((ipv4ToInt(ip) + offset) >>> 0);
}

function cidrToMask(bits) {
  const b = parseInt(bits, 10);
  return [0, 1, 2, 3]
    .map((i) => {
      const n = Math.min(8, Math.max(0, b - i * 8));
      return 256 - Math.pow(2, 8 - n);
    })
    .join('.');
}

function getUsedHostnames(nodes) {
  return new Set(
    nodes
      .map((n) => n.data?.config?.hostname)
      .filter(Boolean)
  );
}

function nextHostname(type, nodes) {
  const prefix = HOSTNAME_PREFIX[type] || type;
  const used = getUsedHostnames(nodes);

  for (let i = 1; i < 1000; i += 1) {
    const candidate = `${prefix}-${pad2(i)}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${prefix}-${Date.now()}`;
}

function getUsedNetworkSubnets(nodes) {
  return new Set(
    nodes
      .filter((n) => n.type === 'networkNode')
      .map((n) => {
        const cfg = n.data?.config || {};
        return cfg.subnet && cfg.mask ? `${cfg.subnet}/${cfg.mask}` : null;
      })
      .filter(Boolean)
  );
}

function nextNetworkConfig(nodes) {
  const used = getUsedNetworkSubnets(nodes);

  for (let x = 1; x < 255; x += 1) {
    const subnet = `10.0.${x}.0`;
    const mask = '24';
    const key = `${subnet}/${mask}`;

    if (!used.has(key)) {
      return {
        subnet,
        mask,
        gateway: `10.0.${x}.250`,
      };
    }
  }

  return {
    subnet: '10.0.254.0',
    mask: '24',
    gateway: '10.0.254.250',
  };
}

function getNetworkNodeById(nodes, id) {
  return nodes.find((n) => n.id === id && n.type === 'networkNode') || null;
}

function getNetworkConfigForNode(nodes, node) {
  if (!node?.parentNode) return null;
  const networkNode = getNetworkNodeById(nodes, node.parentNode);
  return networkNode?.data?.config || null;
}

function getUsedIpsInNetwork(nodes, networkId) {
  const used = new Set();

  nodes.forEach((node) => {
    const cfg = node.data?.config || {};

    if (node.parentNode === networkId && cfg.ip_address) {
      used.add(cfg.ip_address);
    }

    if (node.data?.type === 'router') {
      const interfaces = cfg.interfaces || {};
      Object.values(interfaces).forEach((iface) => {
        if (iface?.ip) used.add(iface.ip);
      });
    }
  });

  return used;
}

function nextHostIp(nodes, networkId) {
  const networkNode = getNetworkNodeById(nodes, networkId);
  const cfg = networkNode?.data?.config || {};
  const subnet = cfg.subnet;

  if (!subnet) return '';

  const parts = subnet.split('.');
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const used = getUsedIpsInNetwork(nodes, networkId);

  // Start at .10 to avoid Docker bridge/dynamic addresses and leave .250 for gateway/router.
  for (let host = 10; host < 240; host += 1) {
    const candidate = `${prefix}.${host}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${prefix}.10`;
}

function createDefaultConfig(type, nodes, parentNetworkId = null) {
  if (type === 'network') {
    return nextNetworkConfig(nodes);
  }

  if (type === 'router') {
    return {
      hostname: nextHostname('router', nodes),
      interfaces: {},
    };
  }

  if (type === 'switch') {
    const config = {
      hostname: nextHostname('switch', nodes),
    };

    if (parentNetworkId) {
      const netCfg = getNetworkNodeById(nodes, parentNetworkId)?.data?.config || {};
      if (netCfg.gateway) config.gateway = netCfg.gateway;
      if (netCfg.mask) config.subnet_mask = cidrToMask(netCfg.mask);
    }

    return config;
  }

  if (type === 'host') {
    const config = {
      hostname: nextHostname('host', nodes),
    };

    if (parentNetworkId) {
      const netCfg = getNetworkNodeById(nodes, parentNetworkId)?.data?.config || {};
      config.ip_address = nextHostIp(nodes, parentNetworkId);

      if (netCfg.mask) config.subnet_mask = cidrToMask(netCfg.mask);
      if (netCfg.gateway) config.gateway = netCfg.gateway;
    }

    return config;
  }

  return {};
}

function getUsedTransitSubnets(nodes) {
  const used = new Set();

  nodes.forEach((node) => {
    if (node.data?.type !== 'router') return;

    const interfaces = node.data?.config?.interfaces || {};

    Object.values(interfaces).forEach((iface) => {
      if (!iface?.subnet || !iface?.mask) return;

      const key = `${iface.subnet}/${iface.mask}`;

      if (iface.subnet.startsWith('10.255.')) {
        used.add(key);
      }
    });
  });

  return used;
}

function nextTransitConfig(nodes) {
  const used = getUsedTransitSubnets(nodes);

  // Docker-safe /29 blocks:
  // 10.255.0.0/29, 10.255.0.8/29, 10.255.0.16/29, ...
  for (let index = 0; index < 8192; index += 1) {
    const subnet = addIpv4('10.255.0.0', index * 8);
    const mask = '29';
    const key = `${subnet}/${mask}`;

    if (!used.has(key)) {
      return {
        subnet,
        mask,
        // .1 is normally Docker bridge gateway, so use .2 and .3 for routers.
        sourceIp: addIpv4(subnet, 2),
        targetIp: addIpv4(subnet, 3),
      };
    }
  }

  return {
    subnet: '10.255.255.0',
    mask: '29',
    sourceIp: '10.255.255.2',
    targetIp: '10.255.255.3',
  };
}

function buildLanRouterInterface(nodes, peerNode) {
  const netCfg = getNetworkConfigForNode(nodes, peerNode);

  if (!netCfg?.subnet || !netCfg?.mask) {
    return null;
  }

  return {
    ip: netCfg.gateway || addIpv4(netCfg.subnet, 250),
    subnet: netCfg.subnet,
    mask: String(netCfg.mask),
  };
}

function applyRouterInterfacesForConnection(nodes, params) {
  const sourceNode = nodes.find((n) => n.id === params.source);
  const targetNode = nodes.find((n) => n.id === params.target);

  if (!sourceNode || !targetNode) return nodes;

  const sourceIsRouter = sourceNode.data?.type === 'router';
  const targetIsRouter = targetNode.data?.type === 'router';

  if (!sourceIsRouter && !targetIsRouter) return nodes;

  const updates = new Map();

  function setRouterInterface(routerNode, peerNode, iface) {
    if (!iface) return;

    const currentConfig = routerNode.data?.config || {};
    const currentInterfaces = currentConfig.interfaces || {};

    // Do not overwrite manual user config.
    if (currentInterfaces[peerNode.id]?.ip) return;

    updates.set(routerNode.id, {
      ...currentConfig,
      interfaces: {
        ...currentInterfaces,
        [peerNode.id]: iface,
      },
    });
  }

  if (sourceIsRouter && targetIsRouter) {
    const existingSourceIface = sourceNode.data?.config?.interfaces?.[targetNode.id];
    const existingTargetIface = targetNode.data?.config?.interfaces?.[sourceNode.id];

    if (!existingSourceIface && !existingTargetIface) {
      const transit = nextTransitConfig(nodes);

      setRouterInterface(sourceNode, targetNode, {
        ip: transit.sourceIp,
        subnet: transit.subnet,
        mask: transit.mask,
      });

      setRouterInterface(targetNode, sourceNode, {
        ip: transit.targetIp,
        subnet: transit.subnet,
        mask: transit.mask,
      });
    }

    return nodes.map((node) =>
      updates.has(node.id)
        ? { ...node, data: { ...node.data, config: updates.get(node.id) } }
        : node
    );
  }

  if (sourceIsRouter && !targetIsRouter) {
    setRouterInterface(sourceNode, targetNode, buildLanRouterInterface(nodes, targetNode));
  }

  if (!sourceIsRouter && targetIsRouter) {
    setRouterInterface(targetNode, sourceNode, buildLanRouterInterface(nodes, sourceNode));
  }

  return nodes.map((node) =>
    updates.has(node.id)
      ? { ...node, data: { ...node.data, config: updates.get(node.id) } }
      : node
  );
}

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [draggedDevice, setDraggedDevice] = useState(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const theme = isDarkMode ? themes.dark : themes.light;

  const [leftPanelWidth, setLeftPanelWidth] = useState(220);
  const [isDragging, setIsDragging] = useState(false);

  const handleExportJSON = useCallback(() => {
    const topology = buildTopology(nodes, edges);
    downloadJSON(topology);
  }, [nodes, edges]);

  const handleExportPNG = useCallback(() => {
    if (reactFlowInstance) {
      downloadPNG(reactFlowInstance, theme.canvasBg);
    }
  }, [reactFlowInstance, theme.canvasBg]);

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

  React.useEffect(() => {
    if (!draggedDevice) {
      setNodes((nds) => nds.filter((n) => n.id !== 'ghost-node'));
    }
  }, [draggedDevice, setNodes]);

  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, theme, isDarkMode },
      }))
    );
  }, [theme, isDarkMode, setNodes]);

  // React Flow change handlers
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  // Updated to use dynamic theme color for new edges
  const onConnect = useCallback((params) => {
    setNodes((nds) => applyRouterInterfacesForConnection(nds, params));

    setEdges((eds) =>
      addEdge(
        {
          ...params,
          animated: false,
          style: { stroke: theme.edgeColor, strokeWidth: 2 },
        },
        eds
      )
    );
  }, [theme]);

  const onNodeClick = useCallback((_, node) => setSelectedNodeId(node.id), []);
  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const handleAdd = useCallback((type) => {
    const id = `${type}_${Math.random().toString(36).substr(2, 5)}`;
    const isNetwork = type === 'network';
    const isRouter = type === 'router';

    setNodes((nds) => {
      const config = createDefaultConfig(type, nds);

      const newNode = {
        id,
        type: isNetwork ? 'networkNode' : isRouter ? 'routerNode' : 'deviceNode',
        data: { type, config, theme, isDarkMode },
        position: { x: 120 + Math.random() * 200, y: 80 + Math.random() * 150 },
        ...(isNetwork && { style: { width: 300, height: 220 } }),
        ...(isRouter && { style: { width: 160, height: 120 } }),
      };

      return nds.concat(newNode);
    });

    setSelectedNodeId(id);
  }, [theme, isDarkMode]);

  // 1. As you drag over the canvas, move the Ghost Node
  const onDragOver = useCallback(
    (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      if (reactFlowInstance && draggedDevice) {
        // Calculate exact canvas coordinates
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        setNodes((nds) => {
          const isNetwork = draggedDevice.type === 'network';
          const isRouter = draggedDevice.type === 'router';
          // Define what the ghost looks like (50% opacity, no pointer events)
          const ghostNode = {
            id: 'ghost-node',
            type: isNetwork ? 'networkNode' : isRouter ? 'routerNode' : 'deviceNode',
            position,
            data: { type: draggedDevice.type, config: {}, theme, isDarkMode },
            style: { 
              opacity: 0.5, 
              pointerEvents: 'none', // Prevents the ghost from blocking drops!
              ...(isNetwork && { width: 300, height: 220 }),
              ...(isRouter && { width: 160, height: 120 })
            },
          };

          // If ghost exists, update it. If not, add it.
          const existing = nds.find((n) => n.id === 'ghost-node');
          return existing 
            ? nds.map((n) => (n.id === 'ghost-node' ? ghostNode : n))
            : [...nds, ghostNode];
        });
      }
    },
    [reactFlowInstance, draggedDevice, setNodes]
  );


  // 3. When you drop, turn the Ghost into a REAL node
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!draggedDevice || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isNetwork = draggedDevice.type === 'network';
      const isRouter = draggedDevice.type === 'router';
      const id = `${draggedDevice.type}_${Math.random().toString(36).substr(2, 5)}`;

      let parentNodeId = undefined;
      let finalPosition = position;

      if (!isNetwork && !isRouter) {
        const targetNetwork = nodes.find((n) => {
          if (n.type !== 'networkNode') return false;
          
          const width = n.style?.width || 300;
          const height = n.style?.height || 220;
          
          return (
            position.x >= n.position.x &&
            position.x <= n.position.x + width &&
            position.y >= n.position.y &&
            position.y <= n.position.y + height
          );
        });

        if (targetNetwork) {
          parentNodeId = targetNetwork.id;
          finalPosition = {
            x: position.x - targetNetwork.position.x,
            y: position.y - targetNetwork.position.y,
          };
        }
      }

      const newNode = {
        id,
        type: isNetwork ? 'networkNode' : isRouter ? 'routerNode' : 'deviceNode',
        position: finalPosition,
        data: {
          type: draggedDevice.type,
          config: createDefaultConfig(draggedDevice.type, nodes, parentNodeId),
          theme,
          isDarkMode,
        },
        ...(isNetwork && { style: { width: 300, height: 220 } }),
        ...(isRouter && { style: { width: 160, height: 120 } }),
        ...(parentNodeId && {
          parentNode: parentNodeId,
          extent: 'parent',
        }),
      };

      setNodes((nds) => nds.filter((n) => n.id !== 'ghost-node').concat(newNode));
      
      setDraggedDevice(null);
      setSelectedNodeId(id);
    },
    [reactFlowInstance, draggedDevice, nodes, setNodes, theme, isDarkMode]
  );

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
    if (reactFlowInstance && selectedNodeId) {
      reactFlowInstance.deleteElements({ nodes: [{ id: selectedNodeId }] });
      setSelectedNodeId(null);
    }
  }, [reactFlowInstance, selectedNodeId]);

  const handleLoadExample = useCallback(() => {
    setNodes(EXAMPLE_NODES);
    setEdges(EXAMPLE_EDGES);
    setSelectedNodeId(null);
  }, []);

  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const topology = JSON.parse(ev.target.result);
        const { nodes: importedNodes, edges: importedEdges } = importTopology(topology);
        setNodes(importedNodes);
        setEdges(importedEdges);
        setSelectedNodeId(null);
      } catch {
        alert('Invalid topology JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleNetworkConfigChange = useCallback((networkId, field, value) => {
  setNodes((nds) =>
    nds.map((node) =>
      node.id === networkId
        ? { ...node, data: { ...node.data, config: { ...node.data.config, [field]: value } } }
        : node
    )
  );
  }, []);

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
      <input
        id="import-json"
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <Toolbar 
        onAdd={handleAdd} 
        onExportJSON={handleExportJSON} 
        onExportPNG={handleExportPNG}
        onImport={() => document.getElementById('import-json').click()}
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
            <DeviceSidebar onAdd={handleAdd}
            theme={theme}
            isDarkMode={isDarkMode}
            setDraggedDevice={setDraggedDevice} 
            />
          </div>
          
          {/* THE DRAG HANDLE */}
          <div 
            style={dynamicStyles.resizer} 
            onMouseDown={startResizing} 
          />
        </div>


        {/* Canvas */}
        <div style={dynamicStyles.canvas}>

          <style>{`
            .react-flow__node-routerNode img,
            .react-flow__node-deviceNode img,
            .react-flow__node-networkNode img {
               filter: ${isDarkMode ? 'invert(1)' : 'none'};
               transition: filter 0.3s ease;
            }
          `}</style>

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
            deleteKeyCode={['Backspace', 'Delete']}
            onNodesDelete={(deletedNodes) => {
              if (deletedNodes.some((n) => n.id === selectedNodeId)) {
                setSelectedNodeId(null);
              }
            }}
            proOptions={{ hideAttribution: true }}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
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
            nodes={nodes}
            edges={edges}
            isDarkMode={isDarkMode} 
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}