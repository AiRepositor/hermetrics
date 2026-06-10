'use client';
import { MessageSquare, Layers, TrendingUp, Activity, MousePointerClick, Database, DollarSign, Clock } from 'lucide-react';
import type { Overview } from '@/lib/types';
import { fmtTokens as fmt, fmtDuration } from '@/lib/formatters';

interface StatCardsProps {
  overview: Overview;
  avgDurationSeconds: number | null;
  prevOverview?: { sessions: number; total_tokens: number; tool_calls: number; estimated_cost: number } | null;
}

function trendArrow(current: number, previous: number | undefined | null, fractionDigits: number = 1): { text: string; color: string } | null {
  if (previous == null || previous === 0) return null;
  const changePct = ((current - previous) / previous) * 100;
  if (isNaN(changePct) || !isFinite(changePct)) return null;
  const absPct = Math.abs(changePct).toFixed(fractionDigits);
  if (changePct > 0) return { text: `\u2191 ${absPct}%`, color: '#4ade80' };
  if (changePct < 0) return { text: `\u2193 ${absPct}%`, color: '#f87171' };
  return null;
}

export function StatCards({ overview: o, avgDurationSeconds, prevOverview }: StatCardsProps) {
  const prev = prevOverview ?? null;

  const stats = [
    {
      icon: <MessageSquare size={18} />,
      label: 'Sessions',
      value: o.total_sessions.toLocaleString(),
      accent: '#a882ff',
      trend: trendArrow(o.total_sessions, prev?.sessions, 0),
    },
    {
      icon: <Layers size={18} />,
      label: 'Total Tokens',
      value: fmt(o.total_tokens),
      accent: '#61afef',
      trend: trendArrow(o.total_tokens, prev?.total_tokens),
    },
    {
      icon: <TrendingUp size={18} />,
      label: 'Input Tokens',
      value: fmt(o.total_input_tokens),
      accent: '#98c379',
      trend: null,
    },
    {
      icon: <Activity size={18} />,
      label: 'Output Tokens',
      value: fmt(o.total_output_tokens),
      accent: '#e5c07b',
      trend: null,
    },
    {
      icon: <MousePointerClick size={18} />,
      label: 'Tool Calls',
      value: o.total_tool_calls.toLocaleString(),
      accent: '#f87171',
      trend: trendArrow(o.total_tool_calls, prev?.tool_calls, 0),
    },
    {
      icon: <Database size={18} />,
      label: 'Cache Read',
      value: fmt(o.total_cache_read),
      accent: '#56b6c2',
      trend: null,
    },
    {
      icon: <DollarSign size={18} />,
      label: 'Est. Cost',
      value: `$${o.total_estimated_cost.toFixed(2)}`,
      accent: '#c678dd',
      trend: trendArrow(o.total_estimated_cost, prev?.estimated_cost, 2),
    },
    {
      icon: <Clock size={18} />,
      label: 'Avg Duration',
      value: fmtDuration(avgDurationSeconds || 0),
      accent: '#d19a66',
      trend: null,
    },
  ];

  return (
    <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
      {stats.map((stat, i) => (
        <div key={i} className="card" style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ color: stat.accent, opacity: 0.8 }}>{stat.icon}</div>
            <span style={{ fontSize: 12, color: '#71717a' }}>{stat.label}</span>
          </div>
          <div className="stat-value" style={{ color: stat.accent }}>
            {stat.value}
            {stat.trend && (
              <span style={{ fontSize: 12, marginLeft: 8, color: stat.trend.color, fontWeight: 500 }}>
                {stat.trend.text}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
