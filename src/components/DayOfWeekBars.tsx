'use client';
import { Calendar } from 'lucide-react';
import type { DowStat } from '@/lib/types';
import { fmtTokens as fmt } from '@/lib/formatters';
import { ChartCard } from './ChartCard';

interface DayOfWeekBarsProps {
  data: DowStat[];
}

export function DayOfWeekBars({ data }: DayOfWeekBarsProps) {
  const maxTokens = Math.max(...data.map(x => x.total_tokens));

  return (
    <ChartCard title="Activity by Day of Week" icon={<Calendar size={16} style={{ color: '#e5c07b' }} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d) => {
          const pct = maxTokens > 0 ? (d.total_tokens / maxTokens * 100) : 0;
          return (
            <div key={d.dow} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 32, fontSize: 12, color: '#71717a', textAlign: 'right' }}>{d.day_name}</span>
              <div className="metric-bar" style={{ width: `${Math.max(pct, 4)}%`, background: 'linear-gradient(90deg, #a882ff, #61afef)' }} />
              <span style={{ fontSize: 12, color: '#71717a', minWidth: 50 }}>{fmt(d.total_tokens)}</span>
              <span style={{ fontSize: 11, color: '#52525b' }}>({d.sessions} sess)</span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
