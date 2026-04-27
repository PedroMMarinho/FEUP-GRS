import React from 'react';
import DEVICES from '../devices';
import logo from '../../public/logo.png';
export default function Toolbar({ onAdd, onExport, onLoadExample, isDarkMode, toggleTheme, theme }) {
  // Updated fallback to use our new minimalist text/accent keys
  const currentTheme = theme || {
    sidebarBg: '#0d1117',
    borderColor: '#1e2438',
    controlsBg: '#131929',
    textMain: '#f8fafc',
    textMuted: '#64748b',
    accentBg: '#f8fafc',
    accentText: '#0f172a',
  };

  const styles = getStyles(currentTheme, isDarkMode);

  return (
    <div style={styles.bar}>
      
      {/* Sleek, Minimalist Bracket Logo with Icon */}
      <div style={styles.brand}>
        <img src={logo} alt="NetCompose Icon" style={styles.brandLogo} />
        <span style={styles.brandAccent}>[</span>
        Net
        <span style={styles.brandSub}>Compose</span>
        <span style={styles.brandAccent}>]</span>
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
            {/* Stripped the hardcoded def.color to use theme text colors */}
            <span
              style={styles.btnIcon}
              dangerouslySetInnerHTML={{ __html: def.icon }}
            />
            <span style={styles.btnLabel}>{def.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.rightSection}>
        <button onClick={onLoadExample} style={styles.exampleBtn} title="Load a pre-built example topology">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Example
        </button>

        <div style={styles.toggleTrack} onClick={toggleTheme}>
          <svg style={{ ...styles.toggleIcon, left: 6 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <svg style={{ ...styles.toggleIcon, right: 6 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <div style={styles.toggleKnob} />
        </div>

        {/* Minimalist High-Contrast Export Button */}
        <button onClick={onExport} style={styles.exportBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export JSON
        </button>
      </div>
    </div>
  );
}

const getStyles = (theme, isDarkMode) => ({
  bar: {
    height: 52,
    background: theme.sidebarBg,
    borderBottom: `1px solid ${theme.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 16, // slightly increased gap for a breather
    flexShrink: 0,
    transition: 'background 0.3s ease, border-color 0.3s ease',
  },
brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 2, 
    fontSize: 16,
    fontWeight: 700,
    color: theme.textMain,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.02em',
    flexShrink: 0,
  },
  brandLogo: {
    height: 24, // Keeps it perfectly scaled with the 16px font
    width: 'auto',
    marginRight: 6, // Adds a nice little breather between the cube and the bracket
    filter: isDarkMode ? 'none' : 'invert(1) hue-rotate(180deg) brightness(1.5)', // Optional: Helps it pop if you switch to light mode!
  },
  brandAccent: {
    color: theme.textMuted,
    fontWeight: 400,
    margin: '0 4px', 
  },
  brandSub: {
    fontWeight: 400,
    color: theme.textMain, 
  },
  divider: {
    width: 1,
    height: 24,
    background: theme.borderColor,
  },
  deviceButtons: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  deviceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '6px 12px',
    background: theme.controlsBg,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    color: theme.textMain,
  },
  btnIcon: {
    width: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: theme.textMuted, // Removed the colored SVG fill, defaults to theme
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: theme.textMuted,
    fontFamily: 'monospace',
  },
  rightSection: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  exampleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 14px',
    background: 'transparent',
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'monospace',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  toggleTrack: {
    position: 'relative',
    width: 52,
    height: 26,
    background: theme.controlsBg, // Tied strictly to theme now
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.3s ease',
  },
  toggleIcon: {
    position: 'absolute',
    top: 5,
    zIndex: 0,
  },
  toggleKnob: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: theme.textMain, // Using theme text for the knob so it pops
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1,
    transform: isDarkMode ? 'translateX(0px)' : 'translateX(26px)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), background 0.3s ease',
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 16px',
    background: theme.accentBg, // High contrast
    border: 'none',
    borderRadius: 6,
    color: theme.accentText, // High contrast text
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'monospace',
    flexShrink: 0,
    transition: 'opacity 0.2s ease',
  },
});