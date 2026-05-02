import React, { useMemo } from 'react';
import { Handle, Position, useEdges, useNodes } from 'reactflow';
import { DEVICE_MAP } from '../devices';

// Distributes N handles evenly along a side (returns % offsets)
function evenOffsets(count) {
  if (count === 1) return ['50%'];
  return Array.from({ length: count }, (_, i) => `${((i + 1) / (count + 1)) * 100}%`);
}

export default function RouterNode({ id, data, selected }) {
  const def = DEVICE_MAP['router'];
  const allEdges = useEdges();
  const allNodes = useNodes();

  // Find which networks this router is connected to via edges
  const connectedNetworks = useMemo(() => {
    const networkIds = new Set();

    allEdges.forEach((edge) => {
      const otherId = edge.source === id ? edge.target : edge.target === id ? edge.source : null;
      if (!otherId) return;

      const otherNode = allNodes.find((n) => n.id === otherId);
      if (!otherNode) return;

      // Direct connection to a network node
      if (otherNode.type === 'networkNode') {
        networkIds.add(otherNode.id);
        return;
      }

      // Connection to a device — check if that device is inside a network (parentNode)
      if (otherNode.parentNode) {
        networkIds.add(otherNode.parentNode);
      }
    });

    return Array.from(networkIds).map((netId) => {
      const netNode = allNodes.find((n) => n.id === netId);
      return {
        id: netId,
        label: netNode?.data?.config?.subnet
          ? `${netNode.data.config.subnet}/${netNode.data.config.mask ?? '24'}`
          : netId,
        ip: netNode?.data?.config?.gateway || null,
      };
    });
  }, [id, allEdges, allNodes]);

  // Split networks across Left/Right sides
  const leftNets  = connectedNetworks.filter((_, i) => i % 2 === 0);
  const rightNets = connectedNetworks.filter((_, i) => i % 2 === 1);

  const leftOffsets  = evenOffsets(leftNets.length);
  const rightOffsets = evenOffsets(rightNets.length);

  return (
    <div
      style={{
        background: '#1a1f2e',
        border: `2px solid ${selected ? def.color : '#2d3348'}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 160,
        boxShadow: selected
          ? `0 0 0 3px ${def.color}33, 0 4px 20px #0008`
          : '0 2px 12px #0005',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Top/Bottom handles for general connections */}
      <Handle type="target" position={Position.Top}    id="top"    style={handleStyle(def.color)} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle(def.color)} />

      {/* Dynamic Left handles — one per even-indexed network */}
      {leftNets.map((net, i) => (
        <Handle
          key={`left-${net.id}`}
          type="source"
          position={Position.Left}
          id={`left-${net.id}`}
          style={{ ...handleStyle(def.color), top: leftOffsets[i], left: -5 }}
        />
      ))}

      {/* Dynamic Right handles — one per odd-indexed network */}
      {rightNets.map((net, i) => (
        <Handle
          key={`right-${net.id}`}
          type="source"
          position={Position.Right}
          id={`right-${net.id}`}
          style={{ ...handleStyle(def.color), top: rightOffsets[i], right: -5 }}
        />
      ))}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: connectedNetworks.length ? 8 : 0 }}>
        <div
          style={{
            width: 30, height: 30,
            background: def.color,
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: def.textColor,
          }}
          dangerouslySetInnerHTML={{ __html: def.icon }}
        />
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: 11, color: '#6b7494', fontFamily: 'monospace' }}>{def.label}</div>
          <div style={{
            fontSize: 12, color: '#e2e8f0', fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100,
          }}>
            {data.config?.hostname || id}
          </div>
        </div>
      </div>

      {/* Interface list — one row per connected network */}
      {connectedNetworks.length > 0 && (
        <div style={{
          borderTop: '1px solid #2d3348',
          paddingTop: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
          {connectedNetworks.map((net) => (
            <div key={net.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, color: '#6b7494', fontFamily: 'monospace', flexShrink: 0 }}>
                {net.label}
              </span>
              <span style={{ fontSize: 10, color: def.color, fontFamily: 'monospace' }}>
                {net.ip || '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {connectedNetworks.length === 0 && (
        <div style={{ fontSize: 9, color: '#3a4060', fontFamily: 'monospace', marginTop: 2 }}>
          no interfaces
        </div>
      )}
    </div>
  );
}

const handleStyle = (color) => ({
  width: 8,
  height: 8,
  background: color,
  border: '2px solid #0d1117',
});