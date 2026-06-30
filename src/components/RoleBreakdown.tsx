'use client';
import { MessageSquare } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { fmtTokens } from '@/lib/formatters';

export interface RoleBreakdownData {
  role: string;
  count: number;
  total_tokens: number;
}

const ROLE_COLORS: Record<string, string> = {
  user: '#61afef',
  assistant: '#98c379',
  tool: '#71717a',
  system: '#e5c07b',
};

export function RoleBreakdown({ data }: { data: RoleBreakdownData[] }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard
        title="Messages by Role"
        icon={<MessageSquare size={16} style={{ color: '#56b6c2' }} />}
        isEmpty
        emptyMessage="No messages recorded"
      >
        {null}
      </ChartCard>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <ChartCard
      title="Messages by Role"
      icon={<MessageSquare size={16} style={{ color: '#56b6c2' }} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d) => {
          const pct = (d.count / maxCount) * 100;
          const color = ROLE_COLORS[d.role] || '#71717a';
          return (
            <div key={d.role} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: color, fontWeight: 500, textTransform: 'capitalize' }}>{d.role}</span>
                <span style={{ color: '#71717a' }}>
                  {d.count.toLocaleString()} msgs · {fmtTokens(d.total_tokens)} tokens
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#1e1e28', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 3,
                    background: color,
                    transition: 'width 0.4s ease',
                    minWidth: 4,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
