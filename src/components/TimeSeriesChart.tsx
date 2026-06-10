'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { fmtTokens as fmt } from '@/lib/formatters';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

interface TimeSeriesChartProps {
  timeSeriesData: Array<{ label: string; input: number; output: number }>;
  granularity: string;
}

export function TimeSeriesChart({ timeSeriesData, granularity }: TimeSeriesChartProps) {
  return (
    <ChartCard title="Token Usage Over Time" icon={<TrendingUp size={16} style={{ color: '#a882ff' }} />} span={2}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={timeSeriesData}>
          <defs>
            <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#61afef" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#61afef" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e5c07b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e5c07b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a35' }}
            interval={granularity === 'hour' ? 3 : granularity === 'day' ? 'preserveStartEnd' : 0} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={(v) => fmt(v)} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="input" name="Input" stroke="#61afef" fill="url(#inputGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="output" name="Output" stroke="#e5c07b" fill="url(#outputGrad)" strokeWidth={2} />
          {timeSeriesData.length > 10 && (
            <Brush dataKey="label" height={24} stroke="#a882ff" fill="#14141a"
              travellerWidth={10} strokeWidth={1}
              tickFormatter={() => ''}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
