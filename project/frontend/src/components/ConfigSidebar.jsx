import React from 'react';
import { DEVICE_MAP } from '../devices';
 
export default function ConfigSidebar({ selectedNode, onConfigChange, onDelete, isDarkMode, theme, nodes, edges, onNetworkConfigChange, onOpenHostTerminal }) {
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
  const isHost = selectedNode.data.type === 'host';
  const hostDisplayName = config.hostname || selectedNode.id;
 
  // If this device lives inside a NetworkNode, grab the network's subnet info
  const parentNetwork = selectedNode.parentNode
    ? nodes.find((n) => n.id === selectedNode.parentNode)
    : null;
  const networkSubnet = parentNetwork?.data?.config?.subnet || null;
  const networkMask   = parentNetwork?.data?.config?.mask   || null;
  const networkGateway = parentNetwork?.data?.config?.gateway || null;
 
  // Derive the prefix bytes from subnet + mask so we can lock them
  // e.g. subnet=10.0.1.0 mask=24 → prefix="10.0.1." lockedOctets=3
  const subnetConstraint = networkSubnet && networkMask ? (() => {
    const maskBits = parseInt(networkMask, 10);
    const lockedOctets = Math.floor(maskBits / 8);
    const parts = networkSubnet.split('.');
    const prefix = parts.slice(0, lockedOctets).join('.') + '.';
    return { prefix, lockedOctets, maskBits };
  })() : null;
 
  // Constrained IP change handler — keeps network prefix, only allows host part changes
  const handleConstrainedIP = (value) => {
    if (!subnetConstraint) { onConfigChange('ip_address', value); return; }
    const { prefix } = subnetConstraint;
    // If user typed the full IP, validate prefix. If just host part, prepend prefix.
    const full = value.startsWith(prefix) ? value : prefix + value.replace(/^[\d.]+\./, '');
    onConfigChange('ip_address', full);
  };
 
  // Direct connections only — excludes networkNodes (they have no handles now)
  const connectedNodes = isRouter
    ? edges
        .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
        .map((e) => {
          const otherId = e.source === selectedNode.id ? e.target : e.source;
          return nodes.find((n) => n.id === otherId);
        })
        .filter((n) => n && n.type !== 'networkNode')
    : [];
 
  // Handler: writes into router's config.interfaces.<nodeId>.field
  const handleIfaceChange = (nodeId, field, value) => {
    const current = config.interfaces || {};
    const updated = {
      ...current,
      [nodeId]: { ...(current[nodeId] || {}), [field]: value },
    };
    onConfigChange('interfaces', updated);
  };
 
  return (
    <>
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerMain}>
          <div style={styles.iconBadge} dangerouslySetInnerHTML={{ __html: def.icon }} />
          <div>
            <div style={styles.deviceType}>{def.label}</div>
            <div style={styles.nodeId}>{selectedNode.id}</div>
          </div>
        </div>
        {isHost && (
          <button
            style={styles.terminalBtn}
            onClick={() => onOpenHostTerminal?.(selectedNode)}
            title="Open host terminal"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>Terminal</span>
          </button>
        )}
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
          return <FieldRow
            key={field.key}
            field={field}
            config={config}
            def={def}
            onConfigChange={onConfigChange}
            styles={styles}
            subnetConstraint={field.key === 'ip_address' || field.key === 'subnet_mask' ? subnetConstraint : null}
            onConstrainedIP={handleConstrainedIP}
            networkGateway={field.key === 'gateway' ? networkGateway : null}
          />;
        })}
      </div>
 
      {/* Router interfaces — one block per directly connected node */}
      {isRouter && (
        <>
          <div style={styles.divider} />
          <div style={styles.sectionLabel}>Interfaces</div>
          {connectedNodes.length === 0 ? (
            <div style={{ padding: '10px 20px', fontSize: 12, color: theme.textMuted, fontFamily: 'monospace' }}>
              Connect to a device to configure interfaces
            </div>
          ) : (
            <div style={styles.fields}>
              {connectedNodes.map((node) => {
                const ifaceConfig = config.interfaces?.[node.id] || {};
                const nodeLabel = node.data?.config?.hostname || node.id;
                const nodeType = node.data?.type || node.type;
                return (
                  <div key={node.id} style={styles.interfaceBlock}>
                    <div style={styles.interfaceHeader}>
                      <span style={{ color: def.color, fontSize: 10 }}>▶</span>
                      <span style={styles.interfaceName}>{nodeType} · {nodeLabel}</span>
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>IP Address</label>
                      <input
                        type="text"
                        value={ifaceConfig.ip || ''}
                        placeholder="10.0.0.1"
                        onChange={(e) => handleIfaceChange(node.id, 'ip', e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Subnet</label>
                      <input
                        type="text"
                        value={ifaceConfig.subnet || ''}
                        placeholder="10.0.0.0"
                        onChange={(e) => handleIfaceChange(node.id, 'subnet', e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Mask</label>
                      <input
                        type="text"
                        value={ifaceConfig.mask || ''}
                        placeholder="24"
                        onChange={(e) => handleIfaceChange(node.id, 'mask', e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
 
      <div style={styles.divider} />
      <button onClick={onDelete} style={styles.deleteBtn}>Delete Node</button>
    </div>
    </>
  );
}
 
function FieldRow({ field, config, def, onConfigChange, styles, subnetConstraint, onConstrainedIP, networkGateway }) {
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
      {field.type === 'text' && (() => {
        // Subnet mask — lock to network mask when inside a NetworkNode
        if (field.key === 'subnet_mask' && subnetConstraint) {
          const b = subnetConstraint.maskBits;
          const forcedMask = [0,1,2,3].map((i) => {
            const n = Math.min(8, Math.max(0, b - i * 8));
            return 256 - Math.pow(2, 8 - n);
          }).join('.');
          if (config['subnet_mask'] !== forcedMask) {
            setTimeout(() => onConfigChange('subnet_mask', forcedMask), 0);
          }
          return (
            <input
              type="text"
              value={forcedMask}
              readOnly
              style={{ ...styles.input, opacity: 0.5, cursor: 'not-allowed' }}
            />
          );
        }
 
        // IP address — show locked prefix + editable host part when inside a NetworkNode
        if (field.key === 'ip_address' && subnetConstraint) {
          const { prefix } = subnetConstraint;
          const full = config[field.key] || '';
          const hostPart = full.startsWith(prefix) ? full.slice(prefix.length) : full;
          return (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                ...styles.input,
                width: 'auto', flexShrink: 0, color: def.color,
                borderRight: 'none', borderRadius: '6px 0 0 6px',
                padding: '7px 6px', fontSize: 12, opacity: 0.8,
              }}>
                {prefix}
              </span>
              <input
                type="text"
                value={hostPart}
                placeholder="10"
                onChange={(e) => onConstrainedIP(prefix + e.target.value)}
                style={{ ...styles.input, borderRadius: '0 6px 6px 0', flexGrow: 1 }}
              />
            </div>
          );
        }
 
        // Gateway — auto-fill from network config when inside a NetworkNode
        if (field.key === 'gateway' && networkGateway) {
          return (
            <input
              type="text"
              value={config[field.key] || networkGateway}
              placeholder={networkGateway}
              onChange={(e) => onConfigChange(field.key, e.target.value)}
              style={{ ...styles.input, borderColor: def.color + '66' }}
            />
          );
        }
 
        // Default
        return (
          <input
            type="text"
            value={config[field.key] || ''}
            placeholder={field.placeholder}
            onChange={(e) => onConfigChange(field.key, e.target.value)}
            style={styles.input}
          />
        );
      })()}
    </div>
  );
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
    justifyContent: 'space-between',
    padding: '16px 20px',
  },
  headerMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
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
  terminalBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 10px',
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    background: theme.controlsBg,
    color: theme.textMain,
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    flexShrink: 0,
  },
  sectionLabel: { fontSize: 12, color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 20px 0' },
  interfaceBlock: { display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: theme.canvasBg, borderRadius: 8, border: '1px solid #1e2438' },
  interfaceHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 },
  interfaceName: { fontSize: 11, color: theme.textMain, fontFamily: 'monospace', fontWeight: 600 },
});