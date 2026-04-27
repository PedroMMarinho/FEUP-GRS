import React from 'react';
import { DEVICE_MAP } from '../devices';

export default function ConfigSidebar({ selectedNode, onConfigChange, onDelete }) {
  if (!selectedNode) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>⬡</div>
        <p style={styles.emptyText}>Select a component<br/>to configure it</p>
      </div>
    );
  }

  const def = DEVICE_MAP[selectedNode.data.type];
  const config = selectedNode.data.config || {};

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ ...styles.iconBadge, background: def.color }}
          dangerouslySetInnerHTML={{ __html: def.icon }}
        />
        <div>
          <div style={styles.deviceType}>{def.label}</div>
          <div style={styles.nodeId}>{selectedNode.id}</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Fields */}
      <div style={styles.fields}>
        {def.configFields.map((field) => {
          // Hide fields that depend on another field's value
          if (field.dependsOn) {
            const parentVal = config[field.dependsOn.key];
            const expected = field.dependsOn.value;
            if (typeof expected === 'boolean' ? !parentVal : parentVal !== expected) return null;
          }

          return (
            <div key={field.key} style={styles.fieldGroup}>
              <label style={styles.label}>
                {field.label}
                {field.required && <span style={{ color: def.color }}> *</span>}
              </label>

              {field.type === 'checkbox' && (
                <label style={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={!!config[field.key]}
                    onChange={(e) => onConfigChange(field.key, e.target.checked)}
                    style={{ accentColor: def.color }}
                  />
                  <span style={{ marginLeft: 8, fontSize: 13, color: '#a0aec0' }}>
                    {config[field.key] ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              )}

              {field.type === 'select' && (
                <select
                  value={config[field.key] || field.options[0]}
                  onChange={(e) => onConfigChange(field.key, e.target.value)}
                  style={styles.input}
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.type === 'text' && (
                <input
                  type="text"
                  value={config[field.key] || ''}
                  placeholder={field.placeholder}
                  onChange={(e) => onConfigChange(field.key, e.target.value)}
                  style={styles.input}
                />
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.divider} />

      <button onClick={onDelete} style={styles.deleteBtn}>
        Delete Node
      </button>
    </div>
  );
}

const styles = {
  panel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  empty: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 40,
    color: '#2d3348',
  },
  emptyText: {
    color: '#4a5568',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
    fontFamily: 'monospace',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#fff',
  },
  deviceType: {
    fontSize: 15,
    fontWeight: 700,
    color: '#e2e8f0',
    fontFamily: "'DM Mono', monospace",
  },
  nodeId: {
    fontSize: 10,
    color: '#4a5568',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: '#1e2438',
    margin: '0 0',
  },
  fields: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flexGrow: 1,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  label: {
    fontSize: 11,
    color: '#718096',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    background: '#0d1117',
    border: '1px solid #2d3348',
    borderRadius: 6,
    padding: '7px 10px',
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: "'DM Mono', monospace",
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  deleteBtn: {
    margin: '12px 20px',
    padding: '8px 0',
    background: 'transparent',
    border: '1px solid #3d2020',
    borderRadius: 6,
    color: '#e05252',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'background 0.15s',
  },
};