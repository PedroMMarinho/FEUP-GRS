import React, { useMemo } from 'react';
import { Handle, Position, useEdges, useNodes } from 'reactflow';
import { DEVICE_MAP } from '../devices';

function evenOffsets(count) {
  if (count === 1) return ['50%'];
  return Array.from({ length: count }, (_, i) => `${((i + 1) / (count + 1)) * 100}%`);
}

export default function RouterNode({ id, data, selected }) {
  const def = DEVICE_MAP['router'];
  const allEdges = useEdges();
  const allNodes = useNodes();

  const theme = data.theme;

  // Interfaces = one per directly connected node (switch, host, router)
  // NetworkNodes are excluded — they are visual only and have no handles
  const interfaces = useMemo(() => {
    return allEdges
      .filter((e) => e.source === id || e.target === id)
      .map((e) => {
        const otherId = e.source === id ? e.target : e.source;
        const otherNode = allNodes.find((n) => n.id === otherId);
        if (!otherNode || otherNode.type === 'networkNode') return null;

        // IP comes from router's own interfaces config map, keyed by connected node id
        const ifaceConfig = data.config?.interfaces?.[otherId] || {};
        const label = otherNode.data?.config?.hostname || otherId;
        const typeLabel = otherNode.data?.type || otherNode.type;

        return {
          id: otherId,
          label,
          typeLabel,
          ip: ifaceConfig.ip || null,
        };
      })
      .filter(Boolean);
  }, [id, allEdges, allNodes, data.config]);

  const leftIfaces  = interfaces.filter((_, i) => i % 2 === 0);
  const rightIfaces = interfaces.filter((_, i) => i % 2 === 1);
  const leftOffsets  = evenOffsets(leftIfaces.length);
  const rightOffsets = evenOffsets(rightIfaces.length);

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
      <Handle type="target" position={Position.Top}    id="top"    style={handleStyle(def.color)} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle(def.color)} />

      {leftIfaces.map((iface, i) => (
        <Handle
          key={`left-${iface.id}`}
          type="source"
          position={Position.Left}
          id={`left-${iface.id}`}
          style={{ ...handleStyle(def.color), top: leftOffsets[i], left: -5 }}
        />
      ))}

      {rightIfaces.map((iface, i) => (
        <Handle
          key={`right-${iface.id}`}
          type="source"
          position={Position.Right}
          id={`right-${iface.id}`}
          style={{ ...handleStyle(def.color), top: rightOffsets[i], right: -5 }}
        />
      ))}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: interfaces.length ? 8 : 0 }}>

        <div
          style={{
            background: def.color,
            borderRadius: 6,
            padding: '3px', 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Inner container: Locks down the physical size of the icon */}
          <div
            style={{
              width: 30,  
              height: 30, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: def.textColor,
            }}
            dangerouslySetInnerHTML={{ __html: def.icon }}
          />
        </div>


        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: 11, color: '#6b7494', fontFamily: 'monospace' }}>{def.label}</div>
          <div style={{
            fontSize: 12, color: '#e2e8f0', fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100,
          }}>
            {data.config?.hostname || (id === 'ghost-node' ? '' : id)}
          </div>
        </div>
      </div>

      {/* Interface list */}
      {interfaces.length > 0 && (
        <div style={{ borderTop: '1px solid #2d3348', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {interfaces.map((iface) => (
            <div key={iface.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, color: '#6b7494', fontFamily: 'monospace', flexShrink: 0 }}>
                {iface.typeLabel} · {iface.label}
              </span>
              <span style={{ fontSize: 10, color: def.color, fontFamily: 'monospace' }}>
                {iface.ip || '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {interfaces.length === 0 && (
        <div style={{ fontSize: 10, color: theme?.textMuted || '#3a4060', fontStyle: 'italic', fontFamily: 'monospace', marginTop: 4 }}>
          no interfaces
        </div>
      )}
    </div>
  );
}

const handleStyle = (color) => ({
  width: 8, height: 8, background: color, border: '2px solid #0d1117',
});