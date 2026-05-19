import { useState, useRef, useEffect } from 'react';

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="currentColor"/>
  </svg>
);

// Renders a single chat message (user or assistant)
function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });
  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">{isUser ? 'U' : <SparkleIcon/>}</div>
      <div>
        <div className={`message-content ${msg.streaming ? 'streaming' : ''}`}>
          {msg.content}
        </div>
        <div className="message-time">{time}</div>
      </div>
    </div>
  );
}

// Renders a small inline status/log line from SSE stream
function LogLine({ text }) {
  const isTimestamp = /^\d{2}:\d{2}:\d{2}/.test(text);
  if (isTimestamp) return null; // skip raw timestamp lines
  return (
    <div className="message-log">
      <div className="log-dot"/>
      <span>{text}</span>
    </div>
  );
}

export default function ChatPanel({ sandboxId, onAIComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [logs, setLogs] = useState([]); // SSE status logs for current invocation
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, logs]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLogs([]);
    setIsStreaming(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch('/api/ai/agent/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, projectId: sandboxId }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const raw of lines) {
          // Strip SSE "data:" prefix if present
          let line = raw.trim();
          if (line.startsWith('data:')) line = line.slice(5).trim();
          if (!line || line === '[DONE]') continue;

          // Try JSON (in case server sends structured data)
          try {
            const parsed = JSON.parse(line);
            if (parsed.content) {
              // AI is streaming actual text content
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last?.streaming) {
                  return [...prev.slice(0, -1), { ...last, content: last.content + parsed.content }];
                }
                return [...prev, { id: Date.now(), role: 'assistant', content: parsed.content, timestamp: new Date(), streaming: true }];
              });
              continue;
            }
            if (parsed.status || parsed.message) {
              setLogs(prev => [...prev, { id: Date.now(), text: parsed.status || parsed.message }]);
              continue;
            }
          } catch { /* not JSON — treat as plain text log */ }

          // Plain-text SSE line → show as log entry
          setLogs(prev => [...prev, { id: Date.now(), text: line }]);
        }
      }

      // Finalise streaming assistant message
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.streaming) return [...prev.slice(0, -1), { ...last, streaming: false }];
        return prev;
      });

      // Auto-refresh preview
      onAIComplete?.();

    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'assistant',
          content: `⚠ Error: ${err.message}`, timestamp: new Date(),
        }]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">AI Chat</span>
        <div className="ai-badge"><SparkleIcon/> AI Agent</div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !isStreaming && (
          <div className="chat-empty">
            <div className="chat-empty-icon">✦</div>
            <h3>Describe your frontend</h3>
            <p>Tell the AI what you want to build — a landing page, dashboard, or anything else.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id}>
            <ChatMessage msg={msg}/>
            {/* Show SSE logs after the last user message while streaming */}
            {idx === messages.length - 1 && isStreaming && logs.map(log => (
              <LogLine key={log.id} text={log.text}/>
            ))}
            {/* Show completed logs after the last exchange */}
            {idx === messages.length - 1 && !isStreaming && logs.length > 0 && (
              <div className="log-group">
                {logs.map(log => <LogLine key={log.id} text={log.text}/>)}
              </div>
            )}
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role === 'user' && logs.length === 0 && (
          <div className="sse-status">
            <div className="spinner"/>
            AI is working…
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Describe the frontend you want to build…"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
            disabled={isStreaming}
            rows={1}
          />
          <button className="btn-send" onClick={sendMessage} disabled={!input.trim() || isStreaming} title="Send (Enter)">
            <SendIcon/>
          </button>
        </div>
        <div className="input-hint">
          {isStreaming ? 'AI is working on your request…' : 'Enter to send · Shift+Enter for new line'}
        </div>
      </div>
    </>
  );
}
