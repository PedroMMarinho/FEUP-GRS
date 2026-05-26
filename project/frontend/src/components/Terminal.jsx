import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function Terminal({
  isOpen,
  nodeName,
  nodeId,
  nodeType,
  initialPosition,
  zIndex = 2000,
  onClose,
  onExecuteCommand,
  theme,
}) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [position, setPosition] = useState(initialPosition || { x: 280, y: 110 });
  const [size, setSize] = useState({ width: 620, height: 360 });

  const dragState = useRef(null);
  const resizeState = useRef(null);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const historyCursorRef = useRef(null);
  const draftCommandRef = useRef('');

  const displayName = nodeName || nodeType || 'device';
  const prompt = useMemo(() => `${displayName}@netcompose:~$`, [displayName]);

  useEffect(() => {
    if (!isOpen) return;

    setHistory((prev) => {
      if (prev.length > 0) return prev;
      return [
        { type: 'meta', text: `Connected to ${displayName}` },
        { type: 'meta', text: 'Type a command and press Enter' },
      ];
    });
  }, [isOpen, displayName]);

  useEffect(() => {
    if (!isOpen) return;
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [history, isOpen]);

  useEffect(() => {
    const handleMove = (event) => {
      if (dragState.current) {
        const { startX, startY, originX, originY } = dragState.current;
        const nextX = Math.max(8, originX + (event.clientX - startX));
        const nextY = Math.max(8, originY + (event.clientY - startY));
        setPosition({ x: nextX, y: nextY });
      }

      if (resizeState.current) {
        const { startX, startY, originWidth, originHeight } = resizeState.current;
        const width = Math.max(420, originWidth + (event.clientX - startX));
        const height = Math.max(240, originHeight + (event.clientY - startY));
        setSize({ width, height });
      }
    };

    const handleUp = () => {
      dragState.current = null;
      resizeState.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const runCommand = async () => {
    const cmd = command.trim();
    if (!cmd || isRunning) return;

    const normalizedCommand = normalizeCommand(cmd);

    setCommandHistory((prev) => [...prev, normalizedCommand.display]);
    historyCursorRef.current = null;
    draftCommandRef.current = '';

    setCommand('');
    setIsRunning(true);
    setHistory((prev) => [...prev, { type: 'command', text: `${prompt} ${normalizedCommand.display}` }]);
    inputRef.current?.focus();

    try {
      const output = await onExecuteCommand?.(nodeId || nodeName, normalizedCommand.command);
      if (output) {
        setHistory((prev) => [...prev, { type: 'output', text: output }]);
      } else {
        setHistory((prev) => [...prev, { type: 'meta', text: '[no output]' }]);
      }
    } catch (err) {
      setHistory((prev) => [...prev, { type: 'error', text: err?.message || String(err) }]);
    } finally {
      setIsRunning(false);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  const styles = getStyles(theme, size, position, isRunning, zIndex);

  return (
    <div style={styles.window}>
      <div
        style={styles.header}
        onMouseDown={(event) => {
          dragState.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          };
        }}
      >
        <div style={styles.titleGroup}>
          <span style={styles.dotRed} />
          <span style={styles.dotYellow} />
          <span style={styles.dotGreen} />
          <span style={styles.title}>{displayName} terminal</span>
        </div>
        <button
          style={{
            ...styles.closeBtn,
            ...(isCloseHovered ? styles.closeBtnHover : {}),
          }}
          onMouseEnter={() => setIsCloseHovered(true)}
          onMouseLeave={() => setIsCloseHovered(false)}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div ref={bodyRef} style={styles.body}>
        {history.map((line, idx) => (
          <pre key={`${line.type}-${idx}`} style={styles[line.type]}>{line.text}</pre>
        ))}
      </div>

      <div style={styles.inputRow}>
        <span style={styles.prompt}>{prompt}</span>
        <input
          ref={inputRef}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault();

              if (commandHistory.length === 0) return;

              if (historyCursorRef.current === null) {
                draftCommandRef.current = command;
                historyCursorRef.current = commandHistory.length - 1;
              } else {
                historyCursorRef.current = Math.max(0, historyCursorRef.current - 1);
              }

              setCommand(commandHistory[historyCursorRef.current]);
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();

              if (historyCursorRef.current === null) return;

              if (historyCursorRef.current >= commandHistory.length - 1) {
                historyCursorRef.current = null;
                setCommand(draftCommandRef.current);
                return;
              }

              historyCursorRef.current += 1;
              setCommand(commandHistory[historyCursorRef.current]);
              return;
            }

            if (event.key === 'Enter') {
              event.preventDefault();
              runCommand();
            }
          }}
          style={styles.input}
          placeholder={isRunning ? 'Running command...' : 'Type command'}
          readOnly={isRunning}
        />
      </div>

      <div
        style={styles.resizeHandle}
        onMouseDown={(event) => {
          event.preventDefault();
          resizeState.current = {
            startX: event.clientX,
            startY: event.clientY,
            originWidth: size.width,
            originHeight: size.height,
          };
        }}
      />
    </div>
  );
}

const getStyles = (theme, size, position, isRunning, zIndex) => ({
  window: {
    position: 'fixed',
    zIndex,
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    background: '#0b1020',
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 10,
    boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    height: 38,
    background: '#0f172a',
    borderBottom: `1px solid ${theme.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 10px',
    cursor: 'move',
    userSelect: 'none',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dotRed: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#ef4444',
  },
  dotYellow: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#f59e0b',
  },
  dotGreen: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#22c55e',
  },
  title: {
    color: '#cbd5e1',
    fontSize: 12,
    marginLeft: 6,
    fontFamily: 'monospace',
    textTransform: 'lowercase',
  },
  closeBtn: {
    height: 24,
    padding: '0 8px',
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    background: 'transparent',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  closeBtnHover: {
    background: '#334155',
    color: '#fff',
    borderColor: '#64748b',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 12px',
    background: '#020617',
  },
  meta: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.45,
    fontFamily: 'monospace',
  },
  command: {
    margin: '0 0 6px 0',
    whiteSpace: 'pre-wrap',
    color: '#f8fafc',
    fontSize: 12,
    lineHeight: 1.45,
    fontFamily: 'monospace',
  },
  output: {
    margin: '0 0 8px 0',
    whiteSpace: 'pre-wrap',
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 1.45,
    fontFamily: 'monospace',
  },
  error: {
    margin: '0 0 8px 0',
    whiteSpace: 'pre-wrap',
    color: '#f87171',
    fontSize: 12,
    lineHeight: 1.45,
    fontFamily: 'monospace',
  },
  inputRow: {
    height: 42,
    borderTop: `1px solid ${theme.borderColor}`,
    background: '#0f172a',
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  prompt: {
    color: '#22c55e',
    fontSize: 12,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  input: {
    flex: 1,
    height: 28,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#f8fafc',
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: isRunning ? 0.6 : 1,
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    cursor: 'nwse-resize',
    background: 'linear-gradient(135deg, transparent 50%, #334155 50%)',
  },
});

function normalizeCommand(command) {
  const trimmed = command.trim();

  if (!trimmed) {
    return { command: trimmed, display: trimmed };
  }

  const pingMatch = trimmed.match(/^ping(?:\s+(-[a-zA-Z]+\s+)*)?(.*)$/);
  if (pingMatch && /^ping(\s|$)/.test(trimmed) && !/\s-c\s+\d+\b/.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    if (parts[0] === 'ping') {
      const target = parts.slice(1).join(' ');
      const commandWithCount = target ? `ping -c 4 ${target}` : 'ping -c 4';
      return { command: commandWithCount, display: commandWithCount };
    }
  }

  return { command: trimmed, display: trimmed };
}