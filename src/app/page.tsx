'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import {
  Activity, BarChart3, Clock, Coins, Cpu, Database,
  DollarSign, Layers, MessageSquare, MousePointerClick,
  Calendar, Filter, RefreshCw, TrendingUp,
  ChevronDown, ChevronRight, ExternalLink,
} from 'lucide-react';

// ──────────── Types ────────────
interface Overview {
  total_sessions: number;
  total_messages: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_tool_calls: number;
  total_cache_read: number;
  total_cache_write: number;
  total_reasoning_tokens: number;
  total_estimated_cost: number;
  total_actual_cost: number;
  first_session: number;
  last_session: number;
}

interface ModelStat {
  model: string;
  sessions: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

interface DailyStat {
  day: string;
  sessions: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

interface HourlyStat {
  hour: number;
  sessions: number;
  input_tokens: number;
  output_tokens: number;
}

interface DowStat {
  dow: number;
  sessions: number;
  total_tokens: number;
  day_name: string;
}

interface SessionStat {
  id: string;
  title: string | null;
  model: string | null;
  started_at: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  message_count: number;
  tool_call_count: number;
  estimated_cost_usd: number;
}

interface ToolStat {
  tool_name: string;
  calls: number;
}

interface AnalyticsData {
  overview: Overview;
  models: ModelStat[];
  daily: DailyStat[];
  hourly: HourlyStat[];
  day_of_week: DowStat[];
  weekly: any[];
  top_sessions: SessionStat[];
  top_tools: ToolStat[];
  cost_daily: { day: string; estimated_cost: number; actual_cost: number }[];
  sources: { source: string; sessions: number; total_tokens: number }[];
  heatmap: Record<string, { total_tokens: number; sessions: number }>;
  duration_stats: { avg_duration_seconds: number | null; max_duration_seconds: number | null };
}

// ──────────── Colors ────────────
const COLORS = ['#a882ff', '#61afef', '#98c379', '#e5c07b', '#f87171', '#56b6c2', '#c678dd', '#d19a66'];
const MODEL_COLORS: Record<string, string> = {
  'deepseek-v4-flash': '#a882ff',
  'deepseek-v4-pro': '#61afef',
  'gpt-5.3-codex': '#98c379',
  'kimi-k2.6:free': '#e5c07b',
  'moonshotai/kimi-k2.6:free': '#e5c07b',
  'nvidia/nemotron-3-super-120b-a12b:free': '#f87171',
};

// ──────────── Formatters ────────────
function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtTime(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(day: string): string {
  const d = new Date(day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ──────────── Custom Tooltip ────────────
const ChartTooltip = ({ active, payload, label }: any) => {
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

// ──────────── Main Dashboard ────────────
export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);
  const [granularity, setGranularity] = useState<'day' | 'week'>('day');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [expandedSession, setExpandedSession] = useState(false);

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
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 80px' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Hermes Token Analytics</h1>
          <p style={{ color: '#71717a', fontSize: 14, margin: '4px 0 0' }}>
            {new Date(o.first_session * 1000).toLocaleDateString()} — {new Date(o.last_session * 1000).toLocaleDateString()}
          </p>
        </div>
        <button onClick={fetchData} style={{
          background: 'transparent', border: '1px solid #2a2a35', borderRadius: 8,
          padding: '8px 14px', color: '#71717a', cursor: 'pointer', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ─── Filters ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} style={{ color: '#71717a' }} />
          <span style={{ fontSize: 13, color: '#71717a' }}>Range:</span>
          {[7, 14, 30, 90].map(d => (
            <button key={d} className={`filter-chip ${timeRange === d ? 'active' : ''}`}
              onClick={() => setTimeRange(d)}>{d}d</button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: '#2a2a35' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart3 size={14} style={{ color: '#71717a' }} />
          <span style={{ fontSize: 13, color: '#71717a' }}>Group:</span>
          <button className={`filter-chip ${granularity === 'day' ? 'active' : ''}`}
            onClick={() => setGranularity('day')}>Daily</button>
          <button className={`filter-chip ${granularity === 'week' ? 'active' : ''}`}
            onClick={() => setGranularity('week')}>Weekly</button>
        </div>
        <div style={{ width: 1, height: 24, background: '#2a2a35' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={14} style={{ color: '#71717a' }} />
          <span style={{ fontSize: 13, color: '#71717a' }}>Model:</span>
          <select value={modelFilter} onChange={e => setModelFilter(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a35', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#e4e4e7' }}>
            <option value="all">All Models</option>
            {modelList.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { icon: <MessageSquare size={18} />, label: 'Sessions', value: o.total_sessions.toLocaleString(), accent: '#a882ff' },
          { icon: <Layers size={18} />, label: 'Total Tokens', value: fmt(o.total_tokens), accent: '#61afef' },
          { icon: <TrendingUp size={18} />, label: 'Input Tokens', value: fmt(o.total_input_tokens), accent: '#98c379' },
          { icon: <Activity size={18} />, label: 'Output Tokens', value: fmt(o.total_output_tokens), accent: '#e5c07b' },
          { icon: <MousePointerClick size={18} />, label: 'Tool Calls', value: o.total_tool_calls.toLocaleString(), accent: '#f87171' },
          { icon: <Database size={18} />, label: 'Cache Read', value: fmt(o.total_cache_read), accent: '#56b6c2' },
          { icon: <DollarSign size={18} />, label: 'Est. Cost', value: `$${o.total_estimated_cost.toFixed(2)}`, accent: '#c678dd' },
          { icon: <Clock size={18} />, label: 'Avg Duration', value: fmtDuration(data.duration_stats.avg_duration_seconds || 0), accent: '#d19a66' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ color: stat.accent, opacity: 0.8 }}>{stat.icon}</div>
              <span style={{ fontSize: 12, color: '#71717a' }}>{stat.label}</span>
            </div>
            <div className="stat-value" style={{ color: stat.accent }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ─── Charts Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Token Usage Over Time */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} style={{ color: '#a882ff' }} />
            Token Usage Over Time
          </h3>
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
                interval={granularity === 'day' ? 'preserveStartEnd' : 0} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => fmt(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="input" name="Input" stroke="#61afef" fill="url(#inputGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="output" name="Output" stroke="#e5c07b" fill="url(#outputGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Model Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={16} style={{ color: '#98c379' }} />
            Model Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.models.map(m => ({ name: m.model, value: m.total_tokens }))}
                cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                paddingAngle={3} dataKey="value"
              >
                {data.models.map((_, i) => (
                  <Cell key={i} fill={MODEL_COLORS[data.models[i].model] || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8 }}>
            {data.models.slice(0, 5).map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: MODEL_COLORS[m.model] || COLORS[i % COLORS.length] }} />
                  <span style={{ color: '#e4e4e7' }}>{m.model.length > 25 ? m.model.slice(0, 25) + '…' : m.model}</span>
                </div>
                <span style={{ color: '#71717a' }}>{fmt(m.total_tokens)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity by Day of Week */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: '#e5c07b' }} />
            Activity by Day of Week
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.day_of_week.map((d) => {
              const maxTokens = Math.max(...data.day_of_week.map(x => x.total_tokens));
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
        </div>

        {/* Hourly Distribution */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: '#56b6c2' }} />
            Hourly Distribution
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
              <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a35' }}
                tickFormatter={(h) => `${h}:00`} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => fmt(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sessions" name="Sessions" fill="#a882ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Over Time */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={16} style={{ color: '#c678dd' }} />
            Cost Over Time (estimated)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.cost_daily.length > 0 ? data.cost_daily.map(d => ({
              label: fmtDate(d.day),
              cost: parseFloat(d.estimated_cost.toFixed(4)),
            })) : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
              <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a35' }} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(2)}`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="cost" name="Cost" fill="#c678dd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {data.cost_daily.length === 0 && (
            <div style={{ textAlign: 'center', color: '#52525b', fontSize: 13, padding: 16 }}>
              No cost data recorded (most models are free tier)
            </div>
          )}
        </div>

        {/* Top Tools */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MousePointerClick size={16} style={{ color: '#f87171' }} />
            Top Tools
          </h3>
          <div>
            {topToolsWithPercent.map((t, i) => (
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
        </div>

        {/* Sources */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExternalLink size={16} style={{ color: '#61afef' }} />
            Sources
          </h3>
          <div>
            {data.sources.map((s, i) => {
              const maxSessions = Math.max(...data.sources.map(x => x.sessions));
              const pct = maxSessions > 0 ? (s.sessions / maxSessions * 100) : 0;
              return (
                <div key={i} className="tool-row">
                  <div style={{ fontSize: 13 }}>{s.source}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: '#2a2a35' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#61afef', transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#71717a' }}>{s.sessions}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Top Sessions ─── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, cursor: 'pointer' }}
          onClick={() => setExpandedSession(!expandedSession)}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} style={{ color: '#d19a66' }} />
            Top Sessions by Token Usage
          </h3>
          {expandedSession ? <ChevronDown size={16} style={{ color: '#71717a' }} /> : <ChevronRight size={16} style={{ color: '#71717a' }} />}
        </div>
        {expandedSession && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a35', color: '#71717a', fontSize: 12, textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Title</th>
                  <th style={{ padding: '8px 12px' }}>Model</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tokens</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Messages</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tool Calls</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost</th>
                  <th style={{ padding: '8px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.top_sessions.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e1e28' }}>
                    <td style={{ padding: '8px 12px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title || 'Untitled'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className="model-badge">{s.model || '—'}</span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>{fmt(s.total_tokens)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#71717a' }}>{s.message_count}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#71717a' }}>{s.tool_call_count}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#71717a' }}>
                      {s.estimated_cost_usd > 0 ? `$${s.estimated_cost_usd.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#71717a', fontSize: 12 }}>{fmtTime(s.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
