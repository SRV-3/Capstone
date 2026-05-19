export default function CodeViewer({ file, onClose }) {
  if (!file) return null;
  const lines = file.content.split('\n');
  const ext = file.path.split('.').pop()?.toLowerCase();

  return (
    <div className="code-viewer">
      <div className="code-viewer-header">
        <span className="code-viewer-icon">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 2a1 1 0 011-1h6l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="code-viewer-path">{file.path}</span>
        <span className="code-viewer-lang">{ext}</span>
        <button className="code-viewer-close icon-btn" onClick={onClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="code-viewer-body">
        <table className="code-table">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="code-line">
                <td className="code-ln">{i + 1}</td>
                <td className="code-content">{line || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
