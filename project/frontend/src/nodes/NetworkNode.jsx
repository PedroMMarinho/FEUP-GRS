import React from 'react';
import { NodeResizer, Handle, Position } from 'reactflow';
import { DEVICE_MAP } from '../devices';

export default function NetworkNode({ data, selected }) {
  const def = DEVICE_MAP['network'];

  const label = data.config?.subnet
    ? `${data.config.subnet}/${data.config.mask || '?'}`
    : data.config?.hostname || 'Network';

  return (
    <>
      {/* Allow resize in all directions */}
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineStyle={{ borderColor: def.color }}
        handleStyle={{ background: def.color, border: 'none', borderRadius: 2, width: 8, height: 8 }}
      />

      {/* Semi-transparent fill area */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `${def.color}12`,
          border: `2px dashed ${selected ? def.color : `${def.color}55`}`,
          borderRadius: 12,
          boxSizing: 'border-box',
          transition: 'border-color 0.15s, background 0.15s',
          pointerEvents: 'none', // let children nodes receive events
        }}
      />

      {/* Label badge pinned to the top-left */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: def.color,
          borderRadius: 6,
          padding: '3px 8px',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{ color: def.textColor, display: 'flex', alignItems: 'center', width: 14, height: 14 }}
          dangerouslySetInnerHTML={{ __html: def.icon }}
        />
        <span style={{ color: def.textColor, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
          {label}
        </span>
        {data.config?.dhcp_enabled && (
          <span style={{ fontSize: 9, color: `${def.textColor}bb`, background: '#ffffff22', padding: '1px 4px', borderRadius: 3 }}>
            DHCP
          </span>
        )}
      </div>

      {/* Connection handles on the border */}
      <Handle type="source" position={Position.Right} style={handleStyle(def.color)} />
      <Handle type="target" position={Position.Left} style={handleStyle(def.color)} />
    </>
  );
}

const handleStyle = (color) => ({
  width: 8,
  height: 8,
  background: color,
  border: '2px solid #0d1117',
});