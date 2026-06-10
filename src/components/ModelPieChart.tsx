'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Cpu } from 'lucide-react';
import type { ModelStat } from '@/lib/types';
import { CHART_COLORS, MODEL_COLORS } from '@/lib/constants';
import { fmtTokens as fmt } from '@/lib/formatters';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

interface ModelPieChartProps {
  models: ModelStat[];
}

export function ModelPieChart({ models }: ModelPieChartProps) {
  return (
    <ChartCard title="Model Breakdown" icon={<Cpu size={16} style={{ color: '#98c379' }} />}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={models.map(m => ({ name: m.model, value: m.total_tokens }))}
            cx="50%" cy="50%" innerRadius={50} outerRadius={90}
            paddingAngle={3} dataKey="value"
          >
            {models.map((_, i) => (
              <Cell key={i} fill={MODEL_COLORS[models[i].model] || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 8 }}>
        {models.slice(0, 5).map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: MODEL_COLORS[m.model] || CHART_COLORS[i % CHART_COLORS.length] }} />
              <span style={{ color: '#e4e4e7' }}>{m.model.length > 25 ? m.model.slice(0, 25) + '\u2026' : m.model}</span>
            </div>
            <span style={{ color: '#71717a' }}>{fmt(m.total_tokens)}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
