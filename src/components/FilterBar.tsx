'use client';
import { Calendar, BarChart3, Cpu } from 'lucide-react';
import { TIME_RANGES, GRANULARITIES } from '@/lib/constants';
import type { RefObject } from 'react';

interface FilterBarProps {
  timeRange: number;
  granularity: string;
  modelFilter: string;
  models: string[];
  onTimeRangeChange: (d: number) => void;
  onGranularityChange: (g: string) => void;
  onModelFilterChange: (m: string) => void;
  filterButtonRef?: RefObject<HTMLButtonElement | null>;
}

export function FilterBar({ timeRange, granularity, modelFilter, models, onTimeRangeChange, onGranularityChange, onModelFilterChange, filterButtonRef }: FilterBarProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calendar size={14} style={{ color: '#71717a' }} />
        <span style={{ fontSize: 13, color: '#71717a' }}>Range:</span>
        {TIME_RANGES.map(d => (
          <button key={d} className={`filter-chip ${timeRange === d ? 'active' : ''}`}
            ref={d === TIME_RANGES[0] ? filterButtonRef : undefined}
            onClick={() => onTimeRangeChange(d)}>{d}d</button>
        ))}
      </div>
      <div style={{ width: 1, height: 24, background: '#2a2a35' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <BarChart3 size={14} style={{ color: '#71717a' }} />
        <span style={{ fontSize: 13, color: '#71717a' }}>Group:</span>
        <button className={`filter-chip ${granularity === 'hour' ? 'active' : ''}`}
          onClick={() => onGranularityChange('hour')}>Hourly</button>
        <button className={`filter-chip ${granularity === 'day' ? 'active' : ''}`}
          onClick={() => onGranularityChange('day')}>Daily</button>
        <button className={`filter-chip ${granularity === 'week' ? 'active' : ''}`}
          onClick={() => onGranularityChange('week')}>Weekly</button>
      </div>
      <div style={{ width: 1, height: 24, background: '#2a2a35' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Cpu size={14} style={{ color: '#71717a' }} />
        <span style={{ fontSize: 13, color: '#71717a' }}>Model:</span>
        <select value={modelFilter} onChange={e => onModelFilterChange(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a35', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#e4e4e7' }}>
          <option value="all">All Models</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <span style={{ fontSize: 11, color: '#52525b', marginLeft: 'auto' }}>⌘K</span>
    </div>
  );
}
