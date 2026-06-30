'use client';
import { MousePointerClick } from 'lucide-react';
import type { ToolStat } from '@/lib/types';
import { ChartCard } from './ChartCard';

interface TopToolsProps {
  tools: (ToolStat & { pct: number })[];
}

export function TopTools({ tools }: TopToolsProps) {
  const isEmpty = !tools || tools.length === 0;

  return (
    <ChartCard title="Top Tools" icon={<MousePointerClick size={16} style={{ color: '#f87171' }} />}
      isEmpty={isEmpty}
      emptyMessage="No tool calls recorded"
    >
      <div>
        {tools.map((t, i) => (
          <div key={i} className="tool-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ color: '#52525b', width: 20, textAlign: 'right', fontSize: 11 }}>{i + 1}</span>
              <span>{t.tool_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 6, borderRadius: 3, background: '#2a2a35' }}>
                <div style={{ width: `${t.pct}%`, height: '100%', borderRadius: 3, background: '#f87171', transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: 12, color: '#71717a', minWidth: 50, textAlign: 'right' }}>{t.calls.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
