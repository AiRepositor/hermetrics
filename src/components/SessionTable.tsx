'use client';
import { useState } from 'react';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import type { SessionStat } from '@/lib/types';
import { fmtTokens as fmt, fmtTimestamp as fmtTime } from '@/lib/formatters';
import { useSortableData } from '@/hooks/useSortableData';

interface SessionTableProps {
  sessions: SessionStat[];
  sortable?: boolean;
  onSessionClick?: (id: string) => void;
}

function SortIndicator({ field, sort }: { field: string; sort: { key: string; direction: 'asc' | 'desc' } }) {
  if (sort.key !== field) return <span style={{ color: '#3f3f46' }}> {'\u00a0'}</span>;
  return <span style={{ color: '#a882ff' }}> {sort.direction === 'asc' ? '\u25b2' : '\u25bc'}</span>;
}

interface SortableHeaderProps {
  field: string;
  label: string;
  align?: 'left' | 'right';
  sort: { key: string; direction: 'asc' | 'desc' };
  onToggle: (key: string) => void;
}

function SortableHeader({ field, label, align, sort, onToggle }: SortableHeaderProps) {
  return (
    <th
      onClick={() => onToggle(field)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        padding: '8px 12px',
        textAlign: align ?? 'left',
      }}
    >
      {label}
      <SortIndicator field={field} sort={sort} />
    </th>
  );
}

export function SessionTable({ sessions, sortable = true, onSessionClick }: SessionTableProps) {
  const [expanded, setExpanded] = useState(false);
  const { sorted, sort, toggleSort } = useSortableData(sessions, 'total_tokens', 'desc');

  const displaySessions = sortable ? sorted : sessions;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} style={{ color: '#d19a66' }} />
          Top Sessions by Token Usage
        </h3>
        {expanded ? (
          <ChevronDown size={16} style={{ color: '#71717a' }} />
        ) : (
          <ChevronRight size={16} style={{ color: '#71717a' }} />
        )}
      </div>
      {expanded && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a35', color: '#71717a', fontSize: 12 }}>
                {sortable ? (
                  <>
                    <SortableHeader field="title" label="Title" align="left" sort={sort} onToggle={toggleSort} />
                    <SortableHeader field="model" label="Model" align="left" sort={sort} onToggle={toggleSort} />
                    <SortableHeader field="total_tokens" label="Tokens" align="right" sort={sort} onToggle={toggleSort} />
                    <SortableHeader field="message_count" label="Messages" align="right" sort={sort} onToggle={toggleSort} />
                    <SortableHeader field="tool_call_count" label="Tool Calls" align="right" sort={sort} onToggle={toggleSort} />
                    <SortableHeader field="estimated_cost_usd" label="Cost" align="right" sort={sort} onToggle={toggleSort} />
                    <SortableHeader field="started_at" label="Date" align="left" sort={sort} onToggle={toggleSort} />
                  </>
                ) : (
                  <>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Title</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Model</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tokens</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Messages</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tool Calls</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {displaySessions.map((s, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid #1e1e28', cursor: onSessionClick ? 'pointer' : 'default' }}
                  onClick={() => onSessionClick?.(s.id)}
                >
                  <td
                    style={{
                      padding: '8px 12px',
                      maxWidth: 250,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.title || 'Untitled'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="model-badge">{s.model || '\u2014'}</span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>{fmt(s.total_tokens)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#71717a' }}>{s.message_count}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#71717a' }}>{s.tool_call_count}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#71717a' }}>
                    {s.estimated_cost_usd > 0 ? `$${s.estimated_cost_usd.toFixed(2)}` : '\u2014'}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#71717a', fontSize: 12 }}>{fmtTime(s.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
