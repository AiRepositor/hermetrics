'use client';
import { useEffect, useState } from 'react';
import { X, User, Bot, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { fmtTokens } from '@/lib/formatters';

interface ToolCall {
  id?: string;
  call_id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

interface Message {
  id: string | number;
  role: string;
  content: string | null;
  token_count: number | null;
  tool_name: string | null;
  tool_calls: string | null; // JSON string from query_analytics.py
  timestamp: number | null;  // unix seconds
}

interface SessionDetailModalProps {
  sessionId: string | null;
  onClose: () => void;
}

function fmtTime(ts: number | string | null): string {
  if (ts == null) return '';
  const ms = typeof ts === 'number' ? ts * 1000 : Date.parse(ts);
  if (isNaN(ms)) return '';
  try {
    return new Date(ms).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return String(ts);
  }
}

function parseToolCalls(raw: string | null): ToolCall[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return null;
  }
}

const roleIcons: Record<string, React.ReactNode> = {
  user: <User size={12} />,
  assistant: <Bot size={12} />,
  tool: <Wrench size={12} />,
  system: <Bot size={12} />,
};

const roleColors: Record<string, { bg: string; text: string }> = {
  user: { bg: '#1d4ed8', text: '#bfdbfe' },
  assistant: { bg: '#15803d', text: '#bbf7d0' },
  tool: { bg: '#374151', text: '#d1d5db' },
  system: { bg: '#92400e', text: '#fde68a' },
};

export function SessionDetailModal({ sessionId, onClose }: SessionDetailModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | number | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/session?id=${encodeURIComponent(sessionId)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load session');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
        else if (data.messages) setMessages(data.messages);
        else setMessages([]);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#14141a', border: '1px solid #2a2a35', borderRadius: 16,
          maxWidth: 800, width: '100%', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #2a2a35',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Session Detail</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#71717a', cursor: 'pointer',
              padding: 4, display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '12px 20px 20px', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#71717a', padding: 40, fontSize: 13 }}>
              Loading messages...
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', color: '#f87171', padding: 40, fontSize: 13 }}>
              {error}
            </div>
          )}
          {!loading && !error && messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#52525b', padding: 40, fontSize: 13 }}>
              No messages found for this session.
            </div>
          )}
          {!loading && !error && messages.map((msg) => {
            const roleStyle = roleColors[msg.role] || roleColors.tool;
            const calls = parseToolCalls(msg.tool_calls);
            const isToolExpanded = expandedTool === msg.id;
            const toolLabel =
              msg.tool_name ??
              (calls && calls.length > 1 ? `${calls.length} tool calls` : 'tool call');
            return (
              <div
                key={String(msg.id)}
                style={{
                  borderBottom: '1px solid #1e1e28',
                  padding: '10px 0',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      background: roleStyle.bg, color: roleStyle.text,
                    }}
                  >
                    {roleIcons[msg.role] || null}
                    {msg.role}
                  </span>
                  {fmtTime(msg.timestamp) && (
                    <span style={{ color: '#52525b' }}>{fmtTime(msg.timestamp)}</span>
                  )}
                  {msg.token_count != null && msg.token_count > 0 && (
                    <span style={{ color: '#71717a', marginLeft: 'auto' }}>
                      {fmtTokens(msg.token_count)} tokens
                    </span>
                  )}
                </div>

                {/* Tool badge / expandable payload */}
                {(msg.tool_name || calls) && (
                  <div style={{ marginBottom: 4 }}>
                    <button
                      onClick={() => setExpandedTool(isToolExpanded ? null : msg.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6, fontSize: 11,
                        background: '#1e1e28', color: '#d19a66', border: '1px solid #2a2a35',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {isToolExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      <Wrench size={11} />
                      {toolLabel}
                    </button>
                    {isToolExpanded && (
                      <pre style={{
                        marginTop: 6, padding: 8, borderRadius: 6,
                        background: '#0a0a0f', color: '#71717a',
                        fontSize: 11, overflow: 'auto', maxHeight: 200,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      }}>
                        {calls
                          ? calls.map((c, i) => (
                              <div key={i} style={{ marginBottom: i < calls.length - 1 ? 8 : 0 }}>
                                {c.function?.name && (
                                  <div style={{ color: '#d19a66', marginBottom: 2 }}>ƒ {c.function.name}</div>
                                )}
                                {c.function?.arguments
                                  ? (() => {
                                      try {
                                        return JSON.stringify(JSON.parse(c.function.arguments), null, 2);
                                      } catch {
                                        return c.function.arguments;
                                      }
                                    })()
                                  : JSON.stringify(c, null, 2)}
                              </div>
                            ))
                          : (msg.tool_name && msg.content)
                            ? msg.content
                            : JSON.stringify(msg, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* Content preview */}
                {msg.content && (
                  <div style={{
                    color: '#a1a1aa', lineHeight: 1.5,
                    maxHeight: 80, overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {msg.content.length > 300
                      ? msg.content.slice(0, 300) + '...'
                      : msg.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
