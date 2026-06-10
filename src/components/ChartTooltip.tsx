'use client';
import { fmtTokens as fmt } from '@/lib/formatters';

export const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
      <div style={{ color: '#71717a', fontSize: 12, marginBottom: 4 }}>{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ color: entry.color, fontWeight: 500 }}>{entry.name}: {fmt(entry.value)}</div>
      ))}
    </div>
  );
};
