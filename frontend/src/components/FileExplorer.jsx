import { useState, useEffect, useCallback } from 'react';

const FolderIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M1 4a1 1 0 011-1h4l1.5 1.5H14a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4z"
      fill={open ? '#C8A96E' : '#8A8580'} fillOpacity="0.7"/>
  </svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>
    <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const FileIcon = ({ name }) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const c = { jsx:'#61DAFB',tsx:'#61DAFB',js:'#F7DF1E',ts:'#3178C6',css:'#1572B6',
    html:'#E34F26',json:'#F5A742',md:'#999',svg:'#FFB13B',dockerfile:'#2496ED' };
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 2a1 1 0 011-1h6l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2z" fill={c[ext]||'#5C5650'} fillOpacity="0.8"/>
      <path d="M9 1v4h4" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
    </svg>
  );
};

function buildTree(files) {
  const root = {};
  files.forEach(path => {
    const parts = path.replace(/^\//, '').split('/');
    let node = root;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) node[part] = { __file: true, __path: path };
      else node[part] = node[part] || { __dir: true };
    });
  });
  return root;
}

function TreeNode({ name, node, depth = 0, onFileOpen, activeFile }) {
  const [open, setOpen] = useState(depth < 1);

  if (node.__file) {
    const isActive = activeFile === node.__path;
    return (
      <div
        className={`file-item depth-${Math.min(depth,2)} clickable ${isActive ? 'active' : ''}`}
        title={node.__path}
        onClick={() => onFileOpen?.(node.__path)}
      >
        <FileIcon name={name} />
        <span className="file-name">{name}</span>
      </div>
    );
  }

  const children = Object.entries(node).filter(([k]) => !k.startsWith('__'));
  const dirs = children.filter(([,v]) => !v.__file);
  const files = children.filter(([,v]) => v.__file);

  return (
    <>
      <div className={`file-item folder depth-${Math.min(depth,2)}`} onClick={() => setOpen(o => !o)}>
        <span style={{ width:10, flexShrink:0 }}><ChevronIcon open={open}/></span>
        <FolderIcon open={open}/>
        <span className="file-name">{name}</span>
      </div>
      {open && (
        <>
          {dirs.map(([k,v]) => <TreeNode key={k} name={k} node={v} depth={depth+1} onFileOpen={onFileOpen} activeFile={activeFile}/>)}
          {files.map(([k,v]) => <TreeNode key={k} name={k} node={v} depth={depth+1} onFileOpen={onFileOpen} activeFile={activeFile}/>)}
        </>
      )}
    </>
  );
}

export default function FileExplorer({ sandboxId, onFileOpen, activeFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opening, setOpening] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!sandboxId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`http://${sandboxId}.agent.localhost/list-files`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [sandboxId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleFileOpen = useCallback(async (filePath) => {
    if (!onFileOpen || opening) return;
    setOpening(true);
    try {
      const res = await fetch(
        `http://${sandboxId}.agent.localhost/read-files?files=${encodeURIComponent(filePath)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Response: { data: [{ "/path/file": "content" }] }
      const fileObj = data.data?.[0] || {};
      const content = Object.values(fileObj)[0] || '';
      onFileOpen({ path: filePath, content });
    } catch (e) { console.error('open file:', e.message); }
    finally { setOpening(false); }
  }, [sandboxId, onFileOpen, opening]);

  const tree = buildTree(files);

  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-title">Explorer</span>
        <button className="icon-btn" onClick={loadFiles} title="Refresh" style={{ width:24, height:24 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M1.5 8A6.5 6.5 0 1114 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 5l2 3-3 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div className="file-tree">
        {loading && (
          <div style={{ padding:'16px', fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:12, height:12, border:'1.5px solid var(--border-muted)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            Loading files…
          </div>
        )}
        {error && <div style={{ padding:'12px 16px', fontSize:12, color:'var(--error)' }}>Failed: {error}</div>}
        {!loading && !error && Object.entries(tree).map(([k,v]) => (
          <TreeNode key={k} name={k} node={v} depth={0} onFileOpen={handleFileOpen} activeFile={activeFile}/>
        ))}
      </div>
    </>
  );
}
