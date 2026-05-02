import React from 'react';
import { DEVICE_MAP } from '../devices';

export default function ConfigSidebar({ selectedNode, onConfigChange, onDelete, isDarkMode, theme, nodes, edges, onNetworkConfigChange }) {
  const styles = getStyles(theme, isDarkMode);
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
  const isRouter = selectedNode.data.type === 'router';

  // Find networks connected to this router (via edges to devices inside networks, or directly)
  const connectedNetworks = isRouter ? getConnectedNetworks(selectedNode.id, nodes, edges) : [];

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ ...styles.iconBadge }}
          dangerouslySetInnerHTML={{ __html: def.icon }}
        />
        <div>
          <div style={styles.deviceType}>{def.label}</div>
          <div style={styles.nodeId}>{selectedNode.id}</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Standard config fields */}
      <div style={styles.fields}>
        {def.configFields.map((field) => {
          if (field.dependsOn) {
            const parentVal = config[field.dependsOn.key];
            const expected = field.dependsOn.value;
            if (typeof expected === 'boolean' ? !parentVal : parentVal !== expected) return null;
          }

          return <FieldRow key={field.key} field={field} config={config} def={def} onConfigChange={onConfigChange} styles={styles} />;
        })}
      </div>

      {/* Router interfaces section — editable per-network gateway IPs */}
      {isRouter && connectedNetworks.length > 0 && (
        <>
          <div style={styles.divider} />
          <div style={styles.sectionLabel}>Interfaces</div>
          <div style={styles.fields}>
            {connectedNetworks.map((net) => {
              const netConfig = net.data?.config || {};
              return (
                <div key={net.id} style={styles.interfaceBlock}>
                  <div style={styles.interfaceHeader}>
                    <span style={{ color: def.color, fontSize: 10 }}>▶</span>
                    <span style={styles.interfaceName}>
                      {netConfig.subnet
                        ? `${netConfig.subnet}/${netConfig.mask ?? '24'}`
                        : net.id}
                    </span>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Gateway IP</label>
                    <input
                      type="text"
                      value={netConfig.gateway || ''}
                      placeholder="10.0.0.1"
                      onChange={(e) => onNetworkConfigChange(net.id, 'gateway', e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Subnet</label>
                    <input
                      type="text"
                      value={netConfig.subnet || ''}
                      placeholder="10.0.0.0"
                      onChange={(e) => onNetworkConfigChange(net.id, 'subnet', e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Mask</label>
                    <input
                      type="text"
                      value={netConfig.mask || ''}
                      placeholder="24"
                      onChange={(e) => onNetworkConfigChange(net.id, 'mask', e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {isRouter && connectedNetworks.length === 0 && (
        <>
          <div style={styles.divider} />
          <div style={styles.sectionLabel}>Interfaces</div>
          <div style={{ padding: '10px 20px', fontSize: 12, color: theme.textMuted, fontFamily: 'monospace' }}>
            Connect to networks to configure interfaces
          </div>
        </>
      )}

      <div style={styles.divider} />
      <button onClick={onDelete} style={styles.deleteBtn}>Delete Node</button>
    </div>
  );
}

function FieldRow({ field, config, def, onConfigChange, styles }) {
  return (
    <div style={styles.fieldGroup}>
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
}

function getConnectedNetworks(routerId, nodes, edges) {
  const networkIds = new Set();

  edges.forEach((edge) => {
    const otherId = edge.source === routerId ? edge.target
                  : edge.target === routerId ? edge.source
                  : null;
    if (!otherId) return;

    const other = nodes.find((n) => n.id === otherId);
    if (!other) return;

    if (other.type === 'networkNode') {
      networkIds.add(other.id);
    } else if (other.parentNode) {
      networkIds.add(other.parentNode);
    }
  });

  return Array.from(networkIds).map((id) => nodes.find((n) => n.id === id)).filter(Boolean);
}

const getStyles = (theme, isDarkMode) => ({
  panel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    background: theme.sidebarBg,
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
    color: theme.borderColor, // Makes the hexagon subtle and match the theme
  },
  emptyText: {
    color: theme.textMuted,
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
    width: 40,
    height: 40,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: isDarkMode ? 'invert(1)' : 'none',
    flexShrink: 0,
    userSelect: 'none',        // Prevents text selection highlighting
    WebkitUserDrag: 'none',    // Stops Chrome/Safari from dragging the element
    pointerEvents: 'none',     // Makes the mouse completely ignore the SVG, killing the ghost drag
  },
  deviceType: {
    fontSize: 16,
    fontWeight: 700,
    color: theme.textMain,
    fontFamily: "'DM Mono', monospace",
  },
  nodeId: {
    fontSize: 14,
    color: theme.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: theme.borderColor,
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
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    background: theme.controlsBg,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    padding: '7px 10px',
    color: theme.textMain,
    fontSize: 14,
    fontFamily: "'DM Mono', monospace",
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  deleteBtn: {
    margin: '12px 20px',
    padding: '8px 0',
    // Adaptive red button for light/dark mode
    background: isDarkMode ? 'transparent' : '#fef2f2',
    border: `1px solid ${isDarkMode ? '#3d2020' : '#fca5a5'}`,
    borderRadius: 6,
    color: isDarkMode ? '#e05252' : '#dc2626',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'all 0.15s',
  },
  sectionLabel: { fontSize: 12, color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 20px 0' },
  interfaceBlock: { display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: theme.canvasBg, borderRadius: 8, border: '1px solid #1e2438' },
  interfaceHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 },
  interfaceName: { fontSize: 11, color: theme.textMain, fontFamily: 'monospace', fontWeight: 600 },
});