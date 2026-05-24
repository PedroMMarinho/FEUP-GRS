import React, { useEffect, useState, useRef } from 'react';

export default function Notification({ type = 'success', message = '', onClose }) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef(null);
  const removeTimer = useRef(null);
  const isHovering = useRef(false);

  useEffect(() => {
    // enter
    const enter = setTimeout(() => setVisible(true), 10);
    // auto-dismiss after 5s (start hide animation, then call onClose)
    hideTimer.current = window.setTimeout(() => {
      if (!isHovering.current) {
        setVisible(false);
        removeTimer.current = window.setTimeout(() => onClose && onClose(), 300);
      }
    }, 5000);

    return () => {
      clearTimeout(enter);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (removeTimer.current) clearTimeout(removeTimer.current);
    };
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    if (removeTimer.current) clearTimeout(removeTimer.current);
    removeTimer.current = window.setTimeout(() => onClose && onClose(), 300);
  };

  const handleMouseEnter = () => {
    isHovering.current = true;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const handleMouseLeave = () => {
    isHovering.current = false;
    // Restart the auto-dismiss timer on mouse leave
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!isHovering.current) {
        setVisible(false);
        removeTimer.current = window.setTimeout(() => onClose && onClose(), 300);
      }
    }, 2000); // 2 second timeout after hovering
  };

  const isError = type === 'error';

  const container = {
    position: 'fixed',
    right: 20,
    bottom: 20,
    zIndex: 9999,
    minWidth: 260,
    maxWidth: 'calc(100% - 40px)',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
    background: isError ? '#fff5f5' : '#f6ffef',
    border: `1px solid ${isError ? 'rgba(220,38,38,0.12)' : 'rgba(34,197,94,0.08)'}`,
    color: isError ? '#7f1d1d' : '#064e3b',
    fontFamily: 'monospace',
    fontSize: 13,
    // animated props
    transition: 'transform 220ms ease, opacity 220ms ease',
    transform: visible ? 'translateY(0px)' : 'translateY(10px)',
    opacity: visible ? 1 : 0,
  };

  const icon = {
    flexShrink: 0,
    width: 18,
    height: 18,
    marginTop: 2,
  };

  const closeBtn = {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
  };

  return (
    <div 
      style={container} 
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={icon} aria-hidden>
        {isError ? (
          // X icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Check icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, paddingRight: 8 }}>{message}</div>

      <button aria-label="Close" onClick={handleClose} style={closeBtn}>&times;</button>
    </div>
  );
}
