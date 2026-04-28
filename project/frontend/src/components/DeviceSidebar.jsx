import React, { useState } from 'react';
import DEVICES from '../devices';

export default function DeviceSidebar({ onAdd, theme }) {
  // State to handle the collapse/expand of the section
  const [isGeneralOpen, setIsGeneralOpen] = useState(true);

  const styles = {
    sidebar: {
      width: '100%', 
      background: theme.sidebarBg,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%',
    },
    // The clickable header
    accordionHeader: {
      padding: '8px 12px',
      background: theme.controlsBg,
      color: theme.textMain,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      cursor: 'pointer',
      borderBottom: `1px solid ${theme.borderColor}`,
      userSelect: 'none',
      whiteSpace: 'nowrap',   // Prevents text from wrapping to line 2
      overflow: 'hidden',     // Hides the text as the panel slides over it
      textOverflow: 'clip',   // Keeps the cutoff sharp and clean
    },
    // The grid holding the buttons
    grid: {
      display: isGeneralOpen ? 'grid' : 'none',
      gridTemplateColumns: 'repeat(auto-fill, 80px)', 
      justifyContent: 'flex-start', 
      gap: 10,
      padding: '16px 12px 16px 24px',
    },
    deviceBtn: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center', // Centers contents vertically
      gap: 8,
      width: 80,  // Exact width!
      height: 75, // Exact height!
      padding: '10px 4px',
      background: theme.controlsBg, // Gives them a nice distinct background
      border: `1px solid ${theme.borderColor}`,
      borderRadius: 8,
      cursor: 'pointer',
      color: theme.textMain,
      transition: 'border-color 0.2s ease, background 0.2s ease',
    }
  };

  return (
    <div style={styles.sidebar}>
      
      {/* Category Header */}
      <div style={styles.accordionHeader} onClick={() => setIsGeneralOpen(!isGeneralOpen)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isGeneralOpen ? 'rotate(90deg)' : 'rotate(0)' }}>
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        General Devices
      </div>

      {/* Collapsible Content */}
      <div style={styles.grid}>
        {DEVICES.map((def) => (
          <button key={def.type} onClick={() => onAdd(def.type)} style={styles.deviceBtn}>
            <span dangerouslySetInnerHTML={{ __html: def.icon }} style={{ color: theme.textMuted }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{def.label}</span>
          </button>
        ))}
      </div>

    </div>
  );
}