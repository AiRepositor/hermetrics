'use client';
import { ExternalLink } from 'lucide-react';
import { ChartCard } from './ChartCard';

interface SourcesListProps {
  sources: Array<{ source: string; sessions: number; total_tokens: number }>;
}

export function SourcesList({ sources }: SourcesListProps) {
  const maxSessions = Math.max(...sources.map(x => x.sessions), 1);
  const isEmpty = !sources || sources.length === 0;

  return (
    <ChartCard title="Sources" icon={<ExternalLink size={16} style={{ color: '#61afef' }} />}
      isEmpty={isEmpty}
      emptyMessage="No sources recorded"
    >
      <div>
        {sources.map((s, i) => {
          const pct = maxSessions > 0 ? (s.sessions / maxSessions * 100) : 0;
          return (
            <div key={i} className="tool-row">
              <div style={{ fontSize: 13 }}>{s.source}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, height: 6, borderRadius: 3, background: '#2a2a35' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#61afef', transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: 12, color: '#71717a' }}>{s.sessions}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
