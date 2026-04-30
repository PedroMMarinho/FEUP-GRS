import React, { useState, useRef } from 'react';
import DEVICES from '../devices';

export default function DeviceSidebar({ onAdd, theme, isDarkMode, setDraggedDevice }) {
  const [isGeneralOpen, setIsGeneralOpen] = useState(true);

  // --- ADDED A REF TO MEASURE THE SIDEBAR ---
  const sidebarRef = useRef(null);
  const [hoverState, setHoverState] = useState({ def: null, top: 0, left: 0 });

  const handleMouseEnter = (e, def) => {
    // 1. Get the button's Y-position (so we can center it vertically)
    const btnRect = e.currentTarget.getBoundingClientRect();

    // 2. Get the entire sidebar's X-position (so we can snap to the slider!)
    const sidebarRect = sidebarRef.current.getBoundingClientRect();

    setHoverState({
      def,
      top: btnRect.top + (btnRect.height / 2) - 60,
      // Snap it to the right edge of the sidebar + a 15px gap
      left: sidebarRect.right + 15,
    });
  };

  const handleMouseLeave = () => {
    setHoverState({ def: null, top: 0, left: 0 });
  };

  const handleDragStart = (event, def) => {
    // 1. Tell App.jsx what we are dragging
    setDraggedDevice(def); 

    const emptyImage = new Image();
    emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
    event.dataTransfer.setDragImage(emptyImage, 0, 0);
    event.dataTransfer.effectAllowed = 'move';
  };

  const styles = {
    sidebar: {
      width: '100%',
      background: theme.sidebarBg,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%',
    },
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
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'clip',
    },
    grid: {
      display: isGeneralOpen ? 'grid' : 'none',
      gridTemplateColumns: 'repeat(auto-fill, 80px)',
      justifyContent: 'flex-start',
      gap: 10,
      padding: '16px 12px 16px 24px',
    },
    deviceBtn: (isHovered) => ({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: 80,
      height: 75,
      padding: '10px 4px',
      background: isHovered ? theme.borderColor : 'transparent',
      border: 'none',
      outline: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      color: theme.textMain,
      transition: 'background 0.15s ease',
    }),
    previewBox: {
      position: 'fixed',
      width: 120,
      height: 120,
      background: theme.controlsBg,
      border: `1px solid ${theme.borderColor}`,
      borderRadius: 12,
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      zIndex: 9999,
      pointerEvents: 'none',
    },
    previewText: {
      fontSize: 14,
      fontWeight: 600,
      color: theme.textMain,
      fontFamily: "'DM Mono', monospace",
    }
  };

  return (
    // --- ATTACH THE REF TO THE ROOT DIV ---
    <div style={styles.sidebar} ref={sidebarRef}>

      <div style={styles.accordionHeader} onClick={() => setIsGeneralOpen(!isGeneralOpen)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isGeneralOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        General Devices
      </div>

      <div style={styles.grid}>
        {DEVICES.map((def) => {
          const isHovered = hoverState.def?.type === def.type;

          return (
            <button
              key={def.type}
              onClick={() => onAdd(def.type)}
              onMouseEnter={(e) => handleMouseEnter(e, def)}
              onMouseLeave={handleMouseLeave}
              style={styles.deviceBtn(isHovered)}
              draggable
              onDragStart={(e) => handleDragStart(e, def)}
              onDragEnd={() => setDraggedDevice(null)}>
                
              <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span dangerouslySetInnerHTML={{ __html: def.icon }} style={{
                  width: 45,
                  height: 45,
                  filter: isDarkMode ? 'invert(1)' : 'none',
                  display: 'flex'
                }} />
              </div>
            </button>

          );
        })}
      </div>

      {hoverState.def && (
        <div
          style={{
            ...styles.previewBox,
            top: hoverState.top,
            left: hoverState.left
          }}
        >
          <span
            dangerouslySetInnerHTML={{ __html: hoverState.def.icon }}
            style={{
              width: 50,
              height: 50,
              filter: isDarkMode ? 'invert(1)' : 'none',
              display: 'flex'
            }}
          />
          <div style={styles.previewText}>{hoverState.def.label}</div>
        </div>
      )}
    </div>
  );
}