import React from 'react';
import { DEVICE_MAP } from '../devices';

export default function ConfigSidebar({ selectedNode, onConfigChange, onDelete, isDarkMode, theme }) {
  // Fallback theme to prevent crashes
  const currentTheme = theme || {
    sidebarBg: '#0d1117',
    borderColor: '#1e2438',
    controlsBg: '#131929',
    textMain: '#f8fafc',
    textMuted: '#64748b',
    accentMain: '#22c55e', 
  };

  const styles = getStyles(currentTheme, isDarkMode);

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
                    // Swapped hardcoded color to your Terminal Green!
                    style={{ accentColor: currentTheme.accentMain }} 
                  />
                  <span style={{ marginLeft: 8, fontSize: 13, color: currentTheme.textMuted }}>
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
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#ffffff', // Kept white so icon contrasts against dynamic device colors
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
});