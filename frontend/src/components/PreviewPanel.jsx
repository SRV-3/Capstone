import { useState, useRef } from 'react';

const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M1.5 8A6.5 6.5 0 1114 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 5l2 3-3 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ExternalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 2h5v5M14 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PreviewPanel({ previewUrl, refreshKey = 0 }) {
  const [loading, setLoading] = useState(true);
  const [manualKey, setManualKey] = useState(0);
  const combinedKey = `${refreshKey}-${manualKey}`;

  return (
    <div className="preview-panel">
      <div className="preview-toolbar">
        <button className="icon-btn" onClick={() => { setLoading(true); setManualKey(k => k + 1); }} title="Refresh">
          <RefreshIcon />
        </button>
        <div className="preview-url">{previewUrl}</div>
        <button className="icon-btn" onClick={() => window.open(previewUrl, '_blank')} title="Open in new tab">
          <ExternalIcon />
        </button>
      </div>
      <div className="preview-iframe-container">
        {loading && (
          <div className="preview-loading">
            <div className="spinner-lg" />
            <span>Loading preview…</span>
          </div>
        )}
        <iframe
          key={combinedKey}
          src={previewUrl}
          className="preview-iframe"
          title="Sandbox Preview"
          onLoad={() => setLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
          style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s ease' }}
        />
      </div>
    </div>
  );
}
