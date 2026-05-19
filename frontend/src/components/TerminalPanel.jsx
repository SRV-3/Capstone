import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

/**
 * XTerm.js terminal connected to the sandbox agent via Socket.IO
 *
 * Socket URL : http://{sandboxId}.agent.localhost
 * Send event : "terminal-input"   (keystroke string)
 * Recv event : "terminal-output"  (shell output string / Buffer)
 */
export default function TerminalPanel({ sandboxId }) {
  const hostRef   = useRef(null);   // DOM mount point for XTerm
  const termRef   = useRef(null);   // Terminal instance
  const fitRef    = useRef(null);   // FitAddon instance
  const sockRef   = useRef(null);   // Socket.IO instance
  const readyRef  = useRef(false);  // guard against StrictMode double-init

  /* ── Initialise once per mount ──────────────────────────────────────────── */
  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;

    /* 1. XTerm */
    const term = new Terminal({
      theme: {
        background:          '#0D0D0D',
        foreground:          '#E8E4DC',
        cursor:              '#C8A96E',
        cursorAccent:        '#0D0D0D',
        selectionBackground: 'rgba(200,169,110,0.25)',
        black:        '#1A1A1A', brightBlack:   '#3A3530',
        red:          '#C0524A', brightRed:     '#D06560',
        green:        '#4A9E6B', brightGreen:   '#5ABE80',
        yellow:       '#C8A96E', brightYellow:  '#E5C487',
        blue:         '#6B8FBF', brightBlue:    '#8AAFD5',
        magenta:      '#9B7BC4', brightMagenta: '#B59ED8',
        cyan:         '#5B9EA6', brightCyan:    '#7ABEC8',
        white:        '#D0C5B5', brightWhite:   '#F0EDE8',
      },
      fontFamily:  "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontSize:     13,
      lineHeight:   1.5,
      cursorBlink:  true,
      cursorStyle:  'bar',
      scrollback:   5000,
      convertEol:   true,
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);

    termRef.current = term;
    fitRef.current  = fit;

    // Fit after the browser has painted so dimensions are real
    requestAnimationFrame(() => {
      try { fit.fit(); } catch { /* ignore if container has 0 size */ }
    });

    /* 2. Socket.IO → sandbox agent */
    const url = `http://${sandboxId}.agent.localhost`;
    term.writeln(`\x1b[2m\x1b[33mConnecting to ${url}…\x1b[0m`);

    const sock = io(url, {
      transports:           ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay:    1500,
      timeout:              12000,
      forceNew:             true,
    });
    sockRef.current = sock;

    sock.on('connect', () => {
      term.writeln(`\r\n\x1b[32m● Connected\x1b[0m  \x1b[2m${sock.id}\x1b[0m\r\n`);
    });

    sock.on('disconnect', (reason) => {
      term.writeln(`\r\n\x1b[33m○ Disconnected — ${reason}\x1b[0m\r\n`);
    });

    sock.on('connect_error', (err) => {
      term.writeln(`\r\n\x1b[31m✗ ${err.message}\x1b[0m\r\n`);
    });

    sock.on('reconnect', (n) => {
      term.writeln(`\r\n\x1b[32m● Reconnected (attempt ${n})\x1b[0m\r\n`);
    });

    /* Receive shell output */
    sock.on('terminal-output', (data) => {
      // data may arrive as string or ArrayBuffer/Buffer
      if (typeof data === 'string') {
        term.write(data);
      } else {
        term.write(new Uint8Array(data));
      }
    });

    /* Send keystrokes */
    term.onData((input) => {
      if (sock.connected) {
        sock.emit('terminal-input', input);
      }
    });

    /* 3. Cleanup */
    return () => {
      sock.disconnect();
      term.dispose();
      termRef.current  = null;
      fitRef.current   = null;
      sockRef.current  = null;
      readyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps — sandboxId is stable for the lifetime of this mount

  /* ── Fit whenever the container is resized ─────────────────────────────── */
  useEffect(() => {
    const doFit = () => {
      try { fitRef.current?.fit(); } catch {}
    };

    const ro = new ResizeObserver(doFit);
    if (hostRef.current) ro.observe(hostRef.current);
    window.addEventListener('resize', doFit);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', doFit);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        flex:       1,
        width:      '100%',
        height:     '100%',
        padding:    '6px 4px',
        background: '#0D0D0D',
        boxSizing:  'border-box',
        overflow:   'hidden',
      }}
    />
  );
}
