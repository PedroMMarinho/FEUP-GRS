import React from 'react';
import { Handle, Position } from 'reactflow';
import { DEVICE_MAP } from '../devices';

export default function DeviceNode({ data, selected }) {
  const def = DEVICE_MAP[data.type];
  if (!def) return null;

  return (
    <div
      style={{
        background: '#1a1f2e',
        border: `2px solid ${selected ? def.color : '#2d3348'}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 140,
        boxShadow: selected
          ? `0 0 0 3px ${def.color}33, 0 4px 20px #0008`
          : '0 2px 12px #0005',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle(def.color)} />
      <Handle type="source" position={Position.Bottom} style={handleStyle(def.color)} />
      <Handle type="target" position={Position.Left} style={handleStyle(def.color)} />
      <Handle type="source" position={Position.Right} style={handleStyle(def.color)} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Colored icon badge */}
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
          <div style={{ fontSize: 11, color: '#6b7494', fontFamily: 'monospace' }}>
            {def.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#e2e8f0',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 90,
            }}
          >
            {data.config?.hostname || data.id}
          </div>
          {data.config?.ip_address && (
            <div style={{ fontSize: 10, color: def.color, fontFamily: 'monospace' }}>
              {data.config.ip_address}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const handleStyle = (color) => ({
  width: 8,
  height: 8,
  background: color,
  border: '2px solid #0d1117',
});