'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AnalyticsData } from '@/lib/types';
import { fmtDate } from '@/lib/formatters';
import { downloadCSV } from '@/lib/export';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { DashboardHeader } from './DashboardHeader';
import { FilterBar } from './FilterBar';
import { StatCards } from './StatCards';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ModelPieChart } from './ModelPieChart';
import { DayOfWeekBars } from './DayOfWeekBars';
import { HourlyDistribution } from './HourlyDistribution';
import { CostChart } from './CostChart';
import { TopTools } from './TopTools';
import { SourcesList } from './SourcesList';
import { SessionTable } from './SessionTable';
import { ActivityHeatmap } from './ActivityHeatmap';
import { RoleBreakdown } from './RoleBreakdown';
import { SessionDetailModal } from './SessionDetailModal';

export function DashboardShell() {
  const { timeRange, granularity, modelFilter, setTimeRange, setGranularity, setModelFilter } = useDashboardFilters();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('days', String(timeRange));
      if (modelFilter !== 'all') params.set('model', modelFilter);
      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [timeRange, modelFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Derived data ───
  const modelList = useMemo(() => {
    if (!data) return [];
    return data.models.map(m => m.model);
  }, [data]);

  const timeSeriesData = useMemo(() => {
    if (!data) return [];
    if (granularity === 'hour') {
      return data.hourly_timeseries.map(d => ({
        label: d.hour_ts.replace(':00', ''),
        ts: d.hour_ts,
        input: d.input_tokens,
        output: d.output_tokens,
        total: (d.input_tokens + d.output_tokens),
        sessions: d.sessions,
      }));
    }
    if (granularity === 'day') {
      return data.daily.map(d => ({
        label: fmtDate(d.day),
        date: d.day,
        input: d.input_tokens,
        output: d.output_tokens,
        total: (d.input_tokens + d.output_tokens),
        sessions: d.sessions,
        cost: d.estimated_cost || 0,
      }));
    }
    // weekly
    return data.weekly.map((w: any) => ({
      label: `Week ${w.week}`,
      input: w.input_tokens,
      output: w.output_tokens,
      total: w.input_tokens + w.output_tokens,
      sessions: w.sessions,
    }));
  }, [data, granularity]);

  const topToolsWithPercent = useMemo(() => {
    if (!data || !data.top_tools.length) return [];
    const total = data.top_tools.reduce((s, t) => s + t.calls, 0);
    return data.top_tools.slice(0, 10).map(t => ({
      ...t,
      pct: total > 0 ? (t.calls / total * 100) : 0,
    }));
  }, [data]);

  // ─── CSV Export ───
  const handleExportCSV = useCallback(() => {
    if (!data) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const headers = ['Title', 'Model', 'Tokens', 'Messages', 'Tool Calls', 'Cost', 'Date'];
    const rows = data.top_sessions.map(s => [
      s.title || 'Untitled',
      s.model || '',
      String(s.total_tokens),
      String(s.message_count),
      String(s.tool_call_count),
      s.estimated_cost_usd.toFixed(2),
      new Date(s.started_at * 1000).toLocaleDateString(),
    ]);
    downloadCSV(`hermes-sessions-${dateStr}.csv`, headers, rows);
  }, [data]);

  // ─── Loading / Error ───
  if (loading && !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: '#a882ff', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#71717a', marginTop: 16, fontSize: 14 }}>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f' }}>
        <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#f87171', marginBottom: 8 }}>⚠ Error loading data</div>
          <p style={{ fontSize: 13, color: '#71717a', marginBottom: 16 }}>{error}</p>
          <button onClick={fetchData} style={{
            background: '#a882ff', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer'
          }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const o = data.overview;
  const isSubsequentLoad = loading && data;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 80px', position: 'relative' }}>
      {/* Subtle loading spinner overlay for subsequent fetches */}
      {isSubsequentLoad && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 1000,
          background: '#14141a', border: '1px solid #2a2a35', borderRadius: 8,
          padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
          opacity: 0.9,
        }}>
          <RefreshCw size={14} style={{ color: '#a882ff', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 12, color: '#71717a' }}>Refreshing...</span>
        </div>
      )}

      <DashboardHeader
        firstSession={o.first_session}
        lastSession={o.last_session}
        onRefresh={fetchData}
        onExportCSV={handleExportCSV}
      />

      <FilterBar
        timeRange={timeRange}
        granularity={granularity}
        modelFilter={modelFilter}
        models={modelList}
        onTimeRangeChange={setTimeRange}
        onGranularityChange={setGranularity}
        onModelFilterChange={setModelFilter}
      />

      <StatCards
        overview={o}
        avgDurationSeconds={data.duration_stats.avg_duration_seconds}
        prevOverview={data.prev_overview ?? null}
      />

      {/* ─── Charts Grid ─── */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <TimeSeriesChart timeSeriesData={timeSeriesData} granularity={granularity} />
        <ModelPieChart models={data.models} />
        <DayOfWeekBars data={data.day_of_week} />
        <HourlyDistribution hourly={data.hourly} />
        <CostChart costDaily={data.cost_daily} />
        <TopTools tools={topToolsWithPercent} />
        <SourcesList sources={data.sources} />
        <ActivityHeatmap heatmap={data.heatmap} />
        {data.messages_by_role && data.messages_by_role.length > 0 && (
          <RoleBreakdown data={data.messages_by_role} />
        )}
      </div>

      <SessionTable sessions={data.top_sessions} onSessionClick={(id) => setSelectedSessionId(id)} />

      {/* ─── Session Detail Modal ─── */}
      <SessionDetailModal
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />

      {/* ─── Footer ─── */}
      <div style={{ textAlign: 'center', color: '#52525b', fontSize: 12, paddingTop: 16, borderTop: '1px solid #1e1e28' }}>
        Hermes Token Analytics · Data from ~/.hermes/state.db · {new Date().toLocaleString()}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
