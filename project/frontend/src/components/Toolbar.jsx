import React, { useEffect, useRef, useState } from 'react';
import logo from '../assets/logo.png';
import Notification from './Notification';

export default function Toolbar({ onExportJSON, onExportPNG, onImport, onLoadExample, isDarkMode, toggleTheme, theme, onRun, onStop, runConfigUrl }) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [hoveredExportItem, setHoveredExportItem] = useState(null);
  const [notification, setNotification] = useState(null);
  const [runPhase, setRunPhase] = useState('idle');
  const runAbortControllerRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Fallback to prevent crashes if theme isn't fully loaded
  const currentTheme = theme || {
    sidebarBg: '#0a0e1a',
    borderColor: '#1e2438',
    controlsBg: '#131929',
    textMain: '#f8fafc',
    textMuted: '#64748b',
    accentBg: '#f8fafc',
    accentText: '#0f172a',
    accentMain: '#22c55e', 
    accentHover: '#16a34a',
  };

  const styles = getStyles(currentTheme, isDarkMode, isExportOpen);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!isExportOpen) return;

      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportOpen(false);
        setHoveredExportItem(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isExportOpen]);

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.bar}>
      
      {/* --- LEFT SECTION --- */}
      <div style={styles.leftSection}>
        {/* 1. Logo */}
        <img src={logo} alt="NetCompose Logo" style={styles.brandLogo} />

        {/* 2. Divider */}
        <div style={styles.divider} />

        {/* 3. Text Name (Tightly grouped) */}
        <div style={styles.brandText}>
          <span style={styles.brandAccent}>[</span>
          <span style={{ color: currentTheme.accentMain }}>Net</span>
          <span style={styles.brandSub}>Compose</span>
          <span style={styles.brandAccent}>]</span>
        </div>
      </div>

      {/* --- CENTER SECTION (Example / Import / Export) --- */}
      <div style={styles.centerSection}>
        <button onClick={onLoadExample} style={{ ...styles.exampleBtn, ...(hovered === 'example' ? styles.buttonHover : {}) }} title="Load a pre-built example topology" onMouseEnter={() => setHovered('example')} onMouseLeave={() => setHovered(null)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{ display: 'block' }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Example</span>
        </button>

        <button onClick={onImport} style={{ ...styles.exampleBtn, ...(hovered === 'import' ? styles.buttonHover : {}) }} title="Import topology from JSON file" onMouseEnter={() => setHovered('import')} onMouseLeave={() => setHovered(null)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Import</span>
        </button>

        <div style={styles.dropdownContainer} ref={exportMenuRef}>
          <button 
            onClick={() => setIsExportOpen(!isExportOpen)} 
            style={{ ...styles.exampleBtn, ...(hovered === 'export' ? styles.buttonHover : {}) }}
            onMouseEnter={() => setHovered('export')}
            onMouseLeave={() => setHovered(null)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export</span>
            <svg 
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ 
                flexShrink: 0,
                transition: 'transform 0.2s ease', 
                transform: isExportOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
              }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isExportOpen && (
            <div style={styles.dropdownMenu}>
              <div 
                style={{
                  ...styles.dropdownItem,
                  ...(hoveredExportItem === 'json' ? styles.dropdownItemHover : {}),
                }}
                onMouseEnter={() => setHoveredExportItem('json')}
                onMouseLeave={() => setHoveredExportItem(null)}
                onClick={() => { onExportJSON?.(); setIsExportOpen(false); setHoveredExportItem(null); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={currentTheme.textMuted} strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                .JSON Config
              </div>
              <div style={styles.dropdownDivider} />
              <div 
                style={{
                  ...styles.dropdownItem,
                  ...(hoveredExportItem === 'png' ? styles.dropdownItemHover : {}),
                }}
                onMouseEnter={() => setHoveredExportItem('png')}
                onMouseLeave={() => setHoveredExportItem(null)}
                onClick={() => { onExportPNG?.(); setIsExportOpen(false); setHoveredExportItem(null); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={currentTheme.textMuted} strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                .PNG Image
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- RIGHT SECTION (Theme Toggle + Run) --- */}
      <div style={styles.rightSection}>
        <div style={styles.toggleTrack} onClick={toggleTheme}>
          <svg style={{ ...styles.toggleIcon, left: 6 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={currentTheme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        <div style={styles.actionRow}>
          <button
            onClick={async () => {
              if (runPhase !== 'idle') return;
              setRunPhase('starting');

              const controller = new AbortController();
              runAbortControllerRef.current = controller;

              try {
                let res;
                if (onRun) {
                  res = await onRun(controller.signal);
                } else if (runConfigUrl) {
                  const r = await fetch(runConfigUrl, { method: 'POST', signal: controller.signal });
                  res = await r.json();
                } else {
                  throw new Error('No run handler or URL provided');
                }

                if (res?.aborted) {
                  return;
                }

                if (res && (res.success === false || res.error)) {
                  setNotification({ type: 'error', message: res.error || res.message || 'Run failed' });
                  setRunPhase('idle');
                } else {
                  setNotification({ type: 'success', message: res && (res.message || 'Ran correctly') || 'Ran correctly' });
                  setRunPhase('running');
                }
              } catch (err) {
                if (err?.name === 'AbortError') {
                  return;
                }

                setNotification({ type: 'error', message: err.message || 'Unknown error' });
                setRunPhase('idle');
              } finally {
                runAbortControllerRef.current = null;
              }
            }}
            style={{ ...styles.runBtn, ...((hovered === 'run' && runPhase === 'idle') ? styles.runHover : {}), ...(runPhase !== 'idle' ? styles.runBtnLoading : {}) }}
            title="Generate configuration and run topology"
            onMouseEnter={() => runPhase === 'idle' && setHovered('run')}
            onMouseLeave={() => setHovered(null)}
            disabled={runPhase !== 'idle'}
          >
            {runPhase === 'starting' || runPhase === 'running' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeDasharray="15.7 47.1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
            <span>{runPhase === 'starting' ? 'Starting...' : runPhase === 'running' ? 'Running...' : 'Generate'}</span>
          </button>

          <button
            onClick={async () => {
              if (runPhase === 'idle') return;

              setRunPhase('stopping');
              runAbortControllerRef.current?.abort();

              try {
                if (!onStop) {
                  throw new Error('No stop handler provided');
                }

                const res = await onStop();

                if (res && (res.success === false || res.error)) {
                  setNotification({ type: 'error', message: res.error || res.message || 'Stop failed' });
                } else {
                  setNotification({ type: 'success', message: res?.message || 'Topology stopped' });
                  setRunPhase('idle');
                }
              } catch (err) {
                setNotification({ type: 'error', message: err.message || 'Unknown error' });
                setRunPhase('running');
              } finally {
                runAbortControllerRef.current = null;
              }
            }}
            style={{ ...styles.stopBtn, ...(hovered === 'stop' && runPhase !== 'idle' ? styles.stopHover : {}), ...(runPhase === 'idle' ? styles.stopBtnDisabled : {}) }}
            title="Stop the running topology"
            onMouseEnter={() => runPhase !== 'idle' && setHovered('stop')}
            onMouseLeave={() => setHovered(null)}
            disabled={runPhase === 'idle' || runPhase === 'stopping'}
          >
            {runPhase === 'stopping' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeDasharray="15.7 47.1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M6 6h12v12H6z" />
              </svg>
            )}
            <span>{runPhase === 'stopping' ? 'Stopping...' : 'Stop'}</span>
          </button>
        </div>
      </div>

      {/* Notification container rendered at bottom-right */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
    </>
  );
}

const getStyles = (theme, isDarkMode, isExportOpen) => ({
  bar: {
    height: 52,
    background: theme.sidebarBg,
    borderBottom: `1px solid ${theme.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    flexShrink: 0,
    transition: 'background 0.3s ease, border-color 0.3s ease',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  brandLogo: {
    height: 32,
    width: 'auto',
  },
  divider: {
    width: 1,
    height: 24,
    background: theme.borderColor,
  },
  brandText: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: 18,
    fontWeight: 700,
    color: theme.textMain,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.02em',
  },
  brandAccent: {
    color: theme.textMuted,
    fontWeight: 400,
    margin: '0 2px', 
  },
  brandSub: {
    fontWeight: 400,
    color: theme.textMain, 
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  actionRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    minWidth: 0,
  },
  centerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    flex: 1,
  },
  exampleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 14px',
    background: 'transparent',
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    color: theme.textMain,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'monospace',
    lineHeight: 1,
  },
  runBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '7px 14px',
    background: theme.accentMain,
    border: 'none',
    borderRadius: 6,
    color: theme.accentText,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'opacity 0.2s ease, background 0.12s ease',
  },
  runHover: {
    background: theme.accentHover,
  },
  runBtnLoading: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  runBtnActive: {
    boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
  },
  stopBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '7px 14px',
    background: '#b42318',
    border: 'none',
    borderRadius: 6,
    color: '#fff5f5',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'opacity 0.2s ease, background 0.12s ease',
  },
  stopHover: {
    background: '#912018',
  },
  stopBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  buttonHover: {
    background: theme.controlsBg,
    border: `1px solid ${theme.accentHover}`,
  },
  toggleTrack: {
    position: 'relative',
    width: 52,
    height: 26,
    background: theme.controlsBg, 
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
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
    background: theme.accentBg, 
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    zIndex: 1,
    transform: isDarkMode ? 'translateX(0px)' : 'translateX(26px)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), background 0.3s ease',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    background: theme.sidebarBg,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 160,
    zIndex: 100,
    overflow: 'hidden',
    fontFamily: 'monospace',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    color: theme.textMain,
    fontSize: 13,
    cursor: 'pointer',
    background: 'transparent',
    transition: 'background 0.2s ease',
  },
  dropdownItemHover: {
    background: theme.controlsBg,
  },
  dropdownDivider: {
    height: 1,
    background: theme.borderColor,
    width: '100%',
  }
});