import React from 'react';
import DEVICES from '../devices';

export default function Toolbar({ onAdd, onExport, onLoadExample }) {
  return (
    <div style={styles.bar}>
      <div style={styles.brand}>
        <span style={styles.brandDot} />
        VNO
        <span style={styles.brandSub}>Designer</span>
      </div>

      <div style={styles.divider} />

      <div style={styles.deviceButtons}>
        {DEVICES.map((def) => (
          <button
            key={def.type}
            onClick={() => onAdd(def.type)}
            style={styles.deviceBtn}
            title={`Add ${def.label}`}
          >
            <span
              style={{ ...styles.btnIcon, color: def.color }}
              dangerouslySetInnerHTML={{ __html: def.icon }}
            />
            <span style={styles.btnLabel}>{def.label}</span>
          </button>
        ))}
      </div>

      <button onClick={onLoadExample} style={styles.exampleBtn} title="Load a pre-built example topology">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        Example
      </button>

      <button onClick={onExport} style={styles.exportBtn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export JSON
      </button>
    </div>
  );
}

const styles = {
  bar: {
    height: 52,
    background: '#0d1117',
    borderBottom: '1px solid #1e2438',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 12,
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 15,
    fontWeight: 800,
    color: '#e2e8f0',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '-0.02em',
    flexShrink: 0,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#7c3aed',
    display: 'inline-block',
  },
  brandSub: {
    fontWeight: 400,
    color: '#4a5568',
    fontSize: 13,
  },
  divider: {
    width: 1,
    height: 24,
    background: '#1e2438',
  },
  deviceButtons: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  deviceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '6px 12px',
    background: '#131929',
    border: '1px solid #1e2438',
    borderRadius: 7,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    color: '#e2e8f0',
  },
  btnIcon: {
    width: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#a0aec0',
    fontFamily: 'monospace',
  },
  exampleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 14px',
    background: 'transparent',
    border: '1px solid #2d3348',
    borderRadius: 7,
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'monospace',
    flexShrink: 0,
    transition: 'border-color 0.15s, color 0.15s',
  },
  exportBtn: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 16px',
    background: '#7c3aed',
    border: 'none',
    borderRadius: 7,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
};