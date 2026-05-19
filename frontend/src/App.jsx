import { useState, useCallback, useRef } from 'react';
import './index.css';
import './App.css';
import ChatPanel from './components/ChatPanel';
import FileExplorer from './components/FileExplorer';
import TerminalPanel from './components/TerminalPanel';
import PreviewPanel from './components/PreviewPanel';
import CodeViewer from './components/CodeViewer';

// ── Icons ────────────────────────────────────────────────────────────────────
const LogoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect width="18" height="18" rx="4" fill="#C8A96E"/>
    <path d="M5 9l3-4 2 3 2-2 2 3" stroke="#1A1000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="12" r="1.5" fill="#1A1000"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="currentColor"/>
  </svg>
);
const MonitorIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const TermIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 6l3 3-3 3M9 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const FilesIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M3 2a1 1 0 011-1h6l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M9 1v4h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const ChevronUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Welcome Screen ────────────────────────────────────────────────────────────
function WelcomeScreen({ onCreateSandbox, loading }) {
  return (
    <div className="app grid-bg">
      <nav className="welcome-topbar">
        <div className="logo"><LogoIcon /><span>DevSandbox</span></div>
        <div className="badge badge-ready"><div className="badge-dot"/>Ready</div>
        <div style={{ flex:1 }}/>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>AI-Powered Frontend Sandbox</div>
      </nav>
      <div className="welcome-screen">
        <div className="welcome-hero">
          <h1>Build anything, <span className="highlight">instantly</span></h1>
          <p>Spin up a cloud sandbox, chat with AI to generate your frontend, and see it live — all in one place.</p>
          <button id="create-sandbox-btn" className="btn-create" onClick={onCreateSandbox} disabled={loading}>
            {loading ? <><div className="spinner"/>Creating Sandbox…</> : <><SparkleIcon/>Create Sandbox</>}
          </button>
          <div className="feature-pills">
            {[
              { icon: <SparkleIcon/>, label:'AI Chat' },
              { icon: <MonitorIcon/>, label:'Live Preview' },
              { icon: <TermIcon/>, label:'Terminal Access' },
              { icon: <FilesIcon/>, label:'File Explorer' },
            ].map(({ icon, label }) => (
              <div key={label} className="pill"><span className="pill-icon">{icon}</span>{label}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── IDE Layout ────────────────────────────────────────────────────────────────
function IDELayout({ sandbox }) {
  const [centerView, setCenterView]     = useState('preview');
  const [openFile, setOpenFile]         = useState(null);
  const [previewKey, setPreviewKey]     = useState(0);
  const [termOpen, setTermOpen]         = useState(false);
  const [termEverOpened, setTermEver]   = useState(false); // keeps terminal mounted after first open
  const [termHeight, setTermHeight]     = useState(280);

  // Open a file from the explorer
  const handleFileOpen = useCallback((file) => {
    setOpenFile(file);
    setCenterView('code');
  }, []);

  // Called by ChatPanel when AI stream finishes → refresh preview
  const handleAIComplete = useCallback(() => {
    setPreviewKey(k => k + 1);
  }, []);

  // ── Terminal bar interaction ──────────────────────────────────────────────
  // Single handler on the whole bar:
  //   pure click (no drag) → toggle open/close
  //   hold + drag up/down  → resize (only when already open)
  const onBarMouseDown = useCallback((e) => {
    // Don't steal focus from the terminal itself
    if (e.target.closest('.xterm') || e.target.closest('.xterm-viewport')) return;

    const startY  = e.clientY;
    const startH  = termHeight;
    let dragged   = false;

    const onMove = (ev) => {
      const delta = startY - ev.clientY;
      if (!dragged && Math.abs(delta) > 5) {
        dragged = true;
        document.body.style.cursor     = 'ns-resize';
        document.body.style.userSelect = 'none';
      }
      if (dragged) {
        // drag up = larger terminal (positive delta)
        const next = Math.max(120, Math.min(560, startH + delta));
        setTermHeight(next);
        // auto-open if dragging up from closed state
        if (delta > 5 && !termOpen) {
          setTermOpen(true);
          setTermEver(true);
        }
      }
    };

    const onUp = () => {
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      if (!dragged) {
        // Pure click → toggle
        setTermOpen(prev => {
          const next = !prev;
          if (next) setTermEver(true); // ensure mounted on first open
          return next;
        });
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault(); // prevent text selection while dragging
  }, [termHeight, termOpen]);

  const shortId = sandbox.sandboxId.slice(0, 14) + '…';
  const openFileName = openFile?.path.split('/').pop();

  return (
    <div className="app ide-layout">
      {/* ── TopBar ── */}
      <header className="topbar">
        <div className="topbar-logo"><LogoIcon/><span>DevSandbox</span></div>
        <div className="topbar-separator"/>
        <div className="breadcrumb">
          <span>sandbox</span>
          <span style={{ color:'var(--border-muted)' }}>/</span>
          <span className="breadcrumb-id" title={sandbox.sandboxId}>{shortId}</span>
        </div>
        <div className="status-indicator">
          <div className="status-dot"/>
          <span className="status-text">Running</span>
        </div>
        <div className="topbar-spacer"/>
        <button
          className="btn-icon-sm"
          onClick={() => { setTermOpen(o => !o); }}
          title="Toggle terminal"
        >
          <TermIcon/>
          <span>Terminal</span>
        </button>
      </header>

      {/* ── Body: Sidebar | Center(Preview) | Right(Chat) ── */}
      <div className="ide-body">
        {/* Left sidebar — file explorer */}
        <aside className="sidebar">
          <FileExplorer
            sandboxId={sandbox.sandboxId}
            onFileOpen={handleFileOpen}
            activeFile={openFile?.path}
          />
        </aside>

        {/* Center — preview / code viewer */}
        <main className="center-main">
          <div className="center-tab-bar">
            <button
              className={`tab ${centerView === 'preview' ? 'active' : ''}`}
              onClick={() => setCenterView('preview')}
            >
              <span className="tab-icon"><MonitorIcon/></span>Preview
            </button>
            {openFile && (
              <button
                className={`tab ${centerView === 'code' ? 'active' : ''}`}
                onClick={() => setCenterView('code')}
              >
                <span className="tab-icon"><FilesIcon/></span>
                {openFileName}
                <span
                  className="tab-close"
                  onClick={(e) => { e.stopPropagation(); setOpenFile(null); setCenterView('preview'); }}
                  title="Close file"
                >×</span>
              </button>
            )}
            {/* Preview auto-refresh indicator */}
            {previewKey > 0 && centerView === 'preview' && (
              <span className="preview-refresh-badge">
                <span style={{ color:'var(--success)', fontSize:9 }}>●</span> Updated
              </span>
            )}
          </div>

          <div className="center-content">
            {centerView === 'preview' ? (
              <PreviewPanel previewUrl={sandbox.previewUrl} refreshKey={previewKey}/>
            ) : (
              <CodeViewer file={openFile} onClose={() => { setOpenFile(null); setCenterView('preview'); }}/>
            )}
          </div>
        </main>

        {/* Right — AI chat */}
        <aside className="chat-sidebar">
          <ChatPanel sandboxId={sandbox.sandboxId} onAIComplete={handleAIComplete}/>
        </aside>
      </div>

      {/* ── Bottom — terminal bar (click anywhere to toggle, drag to resize) ── */}
      <div
        className="bottom-bar"
        style={{ height: termOpen ? termHeight : 36 }}
      >
        {/* Entire bar is the interaction target */}
        <div
          className="terminal-resize-bar"
          onMouseDown={onBarMouseDown}
          style={{ cursor: 'pointer' }}
          title={termOpen ? 'Click to collapse · Drag to resize' : 'Click to open terminal'}
        >
          <div className="terminal-drag-grip" style={{ cursor: termOpen ? 'ns-resize' : 'pointer' }}/>
          <TermIcon/>
          <span className="terminal-bar-label">Terminal</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
            bash — {sandbox.sandboxId.slice(0, 8)}
          </span>
          <div style={{ flex:1 }}/>
          {/* Status dot */}
          <div style={{
            width:7, height:7, borderRadius:'50%',
            background: termOpen ? 'var(--success)' : 'var(--border-muted)',
            transition: 'background 0.3s',
            marginRight: 4,
          }}/>
          {termOpen ? <ChevronDownIcon/> : <ChevronUpIcon/>}
        </div>

        {/* Terminal: mounted once after first open, stays alive (socket kept alive) */}
        {termEverOpened && (
          <div style={{
            /* Take remaining space: total bar height minus the 36px handle */
            height:        termOpen ? `calc(${termHeight}px - 36px)` : 0,
            overflow:      'hidden',
            pointerEvents: termOpen ? 'auto' : 'none',
            display:       'flex',
            flexDirection: 'column',
          }}>
            <TerminalPanel sandboxId={sandbox.sandboxId}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [sandbox, setSandbox] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const createSandbox = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      setSandbox(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  if (sandbox) return <IDELayout sandbox={sandbox}/>;

  return (
    <>
      <WelcomeScreen onCreateSandbox={createSandbox} loading={loading}/>
      {error && (
        <div className="error-toast">
          <span>⚠</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </>
  );
}
