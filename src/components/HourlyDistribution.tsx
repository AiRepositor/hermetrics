'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';
import type { HourlyStat } from '@/lib/types';
import { fmtTokens as fmt } from '@/lib/formatters';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

interface HourlyDistributionProps {
  hourly: HourlyStat[];
}

export function HourlyDistribution({ hourly }: HourlyDistributionProps) {
  const isEmpty = !hourly || hourly.length === 0;

  return (
    <ChartCard title="Hourly Distribution" icon={<Clock size={16} style={{ color: '#56b6c2' }} />} span={2}
      isEmpty={isEmpty}
      emptyMessage="No activity recorded"
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={hourly}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
          <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a35' }}
            tickFormatter={(h) => `${h}:00`} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={(v) => fmt(v)} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="sessions" name="Sessions" fill="#a882ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
