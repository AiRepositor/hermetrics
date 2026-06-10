'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign } from 'lucide-react';
import { fmtDate } from '@/lib/formatters';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

interface CostChartProps {
  costDaily: Array<{ day: string; estimated_cost: number; actual_cost: number }>;
}

export function CostChart({ costDaily }: CostChartProps) {
  const chartData = costDaily.length > 0
    ? costDaily.map(d => ({
        label: fmtDate(d.day),
        cost: parseFloat(d.estimated_cost.toFixed(4)),
      }))
    : [];

  return (
    <ChartCard
      title="Cost Over Time (estimated)"
      icon={<DollarSign size={16} style={{ color: '#c678dd' }} />}
      span={2}
      isEmpty={costDaily.length === 0}
      emptyMessage="No cost data recorded (most models are free tier)"
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a35' }} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={(v) => `$${v.toFixed(2)}`} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="cost" name="Cost" fill="#c678dd" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
