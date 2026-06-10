# Hermes Token Analytics — PoC Review & Improvement Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transform the token analytics PoC from a monolithic single-page dump into a polished, component-decomposed analytics dashboard with URL-persisted filters, heatmap visualization, session drill-down, trend indicators, sortable tables, and clean responsive layout.

**Architecture:** Decompose `page.tsx` into feature modules (components/, hooks/, lib/). Move filters into URL search params via `useSearchParams`. Add a proper heatmap chart. Add trend comparison across time ranges. Make the session table sortable and clickable into a detail panel. Add export-to-CSV. Wrap the fragile API route with proper caching headers.

**Tech Stack:** Next.js 16 App Router, TypeScript, Recharts 3.x, Lucide React, Tailwind CSS 4, Zustand (for local UI state like sort column)

---

## Phase 1: Architecture Cleanup

These tasks fix the structural problems before adding features.

### Task 1: Extract types to a shared module

**Objective:** Move all TypeScript interfaces out of `page.tsx` into a dedicated types file so components can share them.

**Files:**
- Create: `src/lib/types.ts`
- Modify: `src/app/page.tsx` — remove interface blocks, import from `@/lib/types`

**Step 1: Copy all interfaces to the new file**

```typescript
// src/lib/types.ts
export interface Overview {
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

export interface ModelStat {
  model: string;
  sessions: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

export interface DailyStat {
  day: string;
  sessions: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

export interface HourlyStat {
  hour: number;
  sessions: number;
  input_tokens: number;
  output_tokens: number;
}

export interface DowStat {
  dow: number;
  sessions: number;
  total_tokens: number;
  day_name: string;
}

export interface SessionStat {
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

export interface ToolStat {
  tool_name: string;
  calls: number;
}

export interface AnalyticsData {
  overview: Overview;
  models: ModelStat[];
  daily: DailyStat[];
  hourly: HourlyStat[];
  hourly_timeseries: { hour_ts: string; sessions: number; input_tokens: number; output_tokens: number }[];
  day_of_week: DowStat[];
  weekly: any[];
  top_sessions: SessionStat[];
  top_tools: ToolStat[];
  cost_daily: { day: string; estimated_cost: number; actual_cost: number }[];
  sources: { source: string; sessions: number; total_tokens: number }[];
  heatmap: Record<string, { total_tokens: number; sessions: number }>;
  duration_stats: { avg_duration_seconds: number | null; max_duration_seconds: number | null };
}
```

**Step 2: Update page.tsx** — replace all `interface` declarations with imports:

```typescript
import type { AnalyticsData, ModelStat, DowStat, ToolStat } from '@/lib/types';
```

**Step 3: Run `npm run dev`** and verify the dashboard still loads.

**Step 4: Commit**

```bash
git add src/lib/types.ts src/app/page.tsx
git commit -m "refactor: extract types to shared lib/types module"
```

---

### Task 2: Extract formatters and constants to lib modules

**Objective:** Move `fmt()`, `fmtTime()`, `fmtDuration()`, `fmtDate()`, `COLORS`, `MODEL_COLORS` out of `page.tsx`.

**Files:**
- Create: `src/lib/formatters.ts`
- Create: `src/lib/constants.ts`
- Modify: `src/app/page.tsx`

**Step 1: Create `src/lib/formatters.ts`**

```typescript
export function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function fmtTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function fmtDuration(seconds: number | null): string {
  if (!seconds) return '\u2014'; // em-dash
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtDate(day: string): string {
  const d = new Date(day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtCurrency(usd: number): string {
  if (usd === 0) return '\u2014'; // em-dash for zero cost
  if (usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}
```

**Step 2: Create `src/lib/constants.ts`**

```typescript
export const CHART_COLORS = ['#a882ff', '#61afef', '#98c379', '#e5c07b', '#f87171', '#56b6c2', '#c678dd', '#d19a66'];

export const MODEL_COLORS: Record<string, string> = {
  'deepseek-v4-flash': '#a882ff',
  'deepseek-v4-pro': '#61afef',
  'gpt-5.3-codex': '#98c379',
  'kimi-k2.6:free': '#e5c07b',
  'moonshotai/kimi-k2.6:free': '#e5c07b',
  'nvidia/nemotron-3-super-120b-a12b:free': '#f87171',
};

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TIME_RANGES = [7, 14, 30, 90] as const;
export const GRANULARITIES = ['hour', 'day', 'week'] as const;
```

**Step 3: Update `page.tsx` imports** — remove local definitions, import from `@/lib/formatters` and `@/lib/constants`.

**Step 4: Commit**

```bash
git add src/lib/formatters.ts src/lib/constants.ts src/app/page.tsx
git commit -m "refactor: extract formatters and constants to lib modules"
```

---

### Task 3: Decompose page.tsx into feature components

**Objective:** Break the 580-line single file into 10 focused components, each in its own file under `src/components/`.

**Files:**
- Create: `src/components/StatCards.tsx`
- Create: `src/components/TimeSeriesChart.tsx`
- Create: `src/components/ModelPieChart.tsx`
- Create: `src/components/DayOfWeekBars.tsx`
- Create: `src/components/HourlyDistribution.tsx`
- Create: `src/components/CostChart.tsx`
- Create: `src/components/TopTools.tsx`
- Create: `src/components/SourcesList.tsx`
- Create: `src/components/SessionTable.tsx`
- Create: `src/components/FilterBar.tsx`
- Create: `src/components/DashboardHeader.tsx`
- Create: `src/components/ChartCard.tsx` (shared wrapper)
- Modify: `src/app/page.tsx` → thin orchestrator (~80 lines)

**Design pattern for each component:**

```typescript
// Example: src/components/StatCards.tsx
'use client';
import type { Overview } from '@/lib/types';
import { fmtTokens, fmtDuration } from '@/lib/formatters';
import { MessageSquare, Layers, TrendingUp, Activity, MousePointerClick, Database, DollarSign, Clock } from 'lucide-react';
import { ChartCard } from './ChartCard';

interface StatCardsProps {
  overview: Overview;
  avgDurationSeconds: number | null;
}

export function StatCards({ overview: o, avgDurationSeconds }: StatCardsProps) {
  const stats = [
    { icon: MessageSquare, label: 'Sessions', value: o.total_sessions.toLocaleString(), accent: '#a882ff' },
    { icon: Layers, label: 'Total Tokens', value: fmtTokens(o.total_tokens), accent: '#61afef' },
    { icon: TrendingUp, label: 'Input Tokens', value: fmtTokens(o.total_input_tokens), accent: '#98c379' },
    { icon: Activity, label: 'Output Tokens', value: fmtTokens(o.total_output_tokens), accent: '#e5c07b' },
    { icon: MousePointerClick, label: 'Tool Calls', value: o.total_tool_calls.toLocaleString(), accent: '#f87171' },
    { icon: Database, label: 'Cache Read', value: fmtTokens(o.total_cache_read), accent: '#56b6c2' },
    { icon: DollarSign, label: 'Est. Cost', value: `$${o.total_estimated_cost.toFixed(2)}`, accent: '#c678dd' },
    { icon: Clock, label: 'Avg Duration', value: fmtDuration(avgDurationSeconds), accent: '#d19a66' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
      {stats.map((s, i) => (
        <div key={i} className="card" style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ color: s.accent, opacity: 0.8 }}><s.icon size={18} /></div>
            <span style={{ fontSize: 12, color: '#71717a' }}>{s.label}</span>
          </div>
          <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
```

**What `page.tsx` becomes (thin orchestrator):**

```typescript
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AnalyticsData } from '@/lib/types';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FilterBar } from '@/components/FilterBar';
import { StatCards } from '@/components/StatCards';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { ModelPieChart } from '@/components/ModelPieChart';
import { DayOfWeekBars } from '@/components/DayOfWeekBars';
import { HourlyDistribution } from '@/components/HourlyDistribution';
import { CostChart } from '@/components/CostChart';
import { TopTools } from '@/components/TopTools';
import { SourcesList } from '@/components/SourcesList';
import { SessionTable } from '@/components/SessionTable';

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);
  const [granularity, setGranularity] = useState<'hour' | 'day' | 'week'>('day');
  const [modelFilter, setModelFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      params.set('days', String(timeRange));
      if (modelFilter !== 'all') params.set('model', modelFilter);
      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [timeRange, modelFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // loading / error states ...
  if (!data) return null;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 80px' }}>
      <DashboardHeader data={data} onRefresh={fetchData} />
      <FilterBar
        timeRange={timeRange} onTimeRangeChange={setTimeRange}
        granularity={granularity} onGranularityChange={setGranularity}
        modelFilter={modelFilter} onModelFilterChange={setModelFilter}
        models={data.models}
      />
      <StatCards overview={data.overview} avgDurationSeconds={data.duration_stats.avg_duration_seconds} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <TimeSeriesChart data={data} granularity={granularity} />
        <ModelPieChart models={data.models} />
        <DayOfWeekBars data={data.day_of_week} />
        <HourlyDistribution hourly={data.hourly} />
        <CostChart costDaily={data.cost_daily} />
        <TopTools tools={data.top_tools} />
        <SourcesList sources={data.sources} />
      </div>
      
      <SessionTable sessions={data.top_sessions} />
    </div>
  );
}
```

**Step 1: Create** `src/components/ChartCard.tsx` — shared card wrapper

```typescript
'use client';
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  span?: number;
  accent?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function ChartCard({ title, icon, children, span, accent, emptyMessage, isEmpty }: ChartCardProps) {
  return (
    <div className="card" style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        {title}
      </h3>
      {isEmpty && emptyMessage ? (
        <div style={{ textAlign: 'center', color: '#52525b', fontSize: 13, padding: 24 }}>{emptyMessage}</div>
      ) : (
        children
      )}
    </div>
  );
}
```

**Step 2: Create each component** following the pattern above.

**Step 3: Verify** `npm run build` passes.

**Step 4: Commit**

```bash
git add src/components/ src/app/page.tsx
git commit -m "refactor: decompose page.tsx into 12 feature components"
```

---

## Phase 2: URL-Based Filter Persistence

### Task 4: Move filter state to URL search params

**Objective:** Filters survive page reload and can be shared via URL. Use `next/navigation` hooks: `useSearchParams`, `useRouter`.

**Files:**
- Create: `src/hooks/useDashboardFilters.ts`
- Modify: `src/components/FilterBar.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create `useDashboardFilters` hook**

```typescript
// src/hooks/useDashboardFilters.ts
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

const VALID_GRANULARITIES = ['hour', 'day', 'week'] as const;
type Granularity = typeof VALID_GRANULARITIES[number];

export function useDashboardFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const timeRange = parseInt(searchParams.get('days') || '30', 10);
  const granularity = (searchParams.get('granularity') || 'day') as Granularity;
  const modelFilter = searchParams.get('model') || 'all';

  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '30' && key === 'days') params.delete(key); // default
    else if (value === 'day' && key === 'granularity') params.delete(key); // default
    else if (value === 'all' && key === 'model') params.delete(key); // default
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return {
    timeRange,
    granularity,
    modelFilter,
    setTimeRange: (d: number) => setFilter('days', String(d)),
    setGranularity: (g: Granularity) => setFilter('granularity', g),
    setModelFilter: (m: string) => setFilter('model', m),
  };
}
```

**Step 2: Update `FilterBar`** to use `onChange` props from the hook.

**Step 3: Update `page.tsx`** — remove local `useState` for filters, use the hook instead:

```typescript
const { timeRange, granularity, modelFilter, setTimeRange, setGranularity, setModelFilter } = useDashboardFilters();
```

**Step 4: Wrap `page.tsx` in `<Suspense>`** — `useSearchParams` requires a Suspense boundary. Wrap in a shell component:

```typescript
// src/app/page.tsx
import { Suspense } from 'react';
import { DashboardShell } from '@/components/DashboardShell';

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardShell />
    </Suspense>
  );
}
```

Move the existing dashboard code into `DashboardShell`.

**Step 5: Verify** — visit `/` (defaults), `/`?days=7&granularity=hour, `/`?model=deepseek-v4-pro. Filters should persist on reload.

**Step 6: Commit**

```bash
git add src/hooks/ src/components/DashboardShell.tsx src/components/FilterBar.tsx src/app/page.tsx
git commit -m "feat: URL-based filter persistence with useSearchParams"
```

---

## Phase 3: Missing Visualizations & Data

### Task 5: Add heatmap chart (Day × Hour activity matrix)

**Objective:** Render the `data.heatmap` data that's already fetched but never displayed.

**Files:**
- Create: `src/components/ActivityHeatmap.tsx`
- Modify: `src/app/page.tsx` (or DashboardShell) — add heatmap to layout

**Approach:** Use a CSS Grid matrix (7 columns × 24 rows) with color intensity based on token count. This is simpler and more readable than a Recharts chart for heatmap data.

```typescript
// src/components/ActivityHeatmap.tsx
'use client';
import { ChartCard } from './ChartCard';
import { Calendar } from 'lucide-react';
import { DAY_NAMES } from '@/lib/constants';

interface HeatmapCell {
  total_tokens: number;
  sessions: number;
}

interface ActivityHeatmapProps {
  heatmap: Record<string, HeatmapCell>;
}

function getColor(tokens: number, maxTokens: number): string {
  if (tokens === 0) return 'rgba(42, 42, 53, 0.4)'; // empty
  const intensity = tokens / maxTokens;
  // Interpolate from dark purple to bright purple
  const r = Math.round(40 + intensity * 128);
  const g = Math.round(30 + intensity * 100);
  const b = Math.round(60 + intensity * 195);
  return `rgb(${r}, ${g}, ${b})`;
}

export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxTokens = Math.max(1, ...Object.values(heatmap).map(v => v.total_tokens));

  return (
    <ChartCard
      title="Activity Heatmap"
      icon={<Calendar size={16} style={{ color: '#e5c07b' }} />}
      span={2}
    >
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `32px repeat(24, minmax(24px, 1fr))`, gap: 2, fontSize: 10 }}>
          {/* Header row: hour labels */}
          <div /> {/* empty corner */}
          {hours.map(h => (
            <div key={h} style={{ color: '#71717a', textAlign: 'center', paddingBottom: 4 }}>
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
          {/* Data rows */}
          {DAY_NAMES.map((day, dow) => (
            <>
              <div key={`label-${dow}`} style={{ color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                {day}
              </div>
              {hours.map(h => {
                const key = `${dow}_${h}`;
                const cell = heatmap[key];
                const tokens = cell?.total_tokens || 0;
                return (
                  <div
                    key={`${dow}-${h}`}
                    title={`${day} ${h}:00 — ${tokens.toLocaleString()} tokens · ${cell?.sessions || 0} sessions`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 3,
                      background: getColor(tokens, maxTokens),
                      cursor: 'default',
                    }}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
```

**Step 2: Add to layout** — insert `<ActivityHeatmap heatmap={data.heatmap} />` in the dashboard grid.

**Step 3: Commit**

```bash
git add src/components/ActivityHeatmap.tsx
git commit -m "feat: add activity heatmap (day × hour matrix)"
```

---

### Task 6: Add trend comparison indicators to stat cards

**Objective:** Show period-over-period change (e.g., "↑ 23% vs last 7 days") on stat cards.

**Files:**
- Modify: `src/components/StatCards.tsx`
- Modify: `src/lib/types.ts` — add trend fields
- Modify: `scripts/query_analytics.py` — compute previous period

**Approach:** Fetch two time ranges: current period and previous period (same length). Compare totals.

**Step 1: Extend `src/lib/types.ts`**

```typescript
export interface TrendData {
  current: number;
  previous: number;
  changePercent: number | null; // null if previous was 0
  isUp: boolean;
}

export interface OverviewWithTrends extends Overview {
  trends: {
    sessions: TrendData;
    total_tokens: TrendData;
    tool_calls: TrendData;
    estimated_cost: TrendData;
  };
}
```

**Step 2: Add a second query in the Python script**

```python
# After the main query, compute previous period
prev_cutoff = cutoff_ts - (datetime.now().timestamp() - cutoff_ts)
prev_where = f"started_at >= ? AND started_at < ?"
prev_params = [prev_cutoff, cutoff_ts]

cur.execute(f"""
    SELECT 
        COUNT(*) as sessions,
        COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
        COALESCE(SUM(tool_call_count), 0) as tool_calls,
        COALESCE(SUM(estimated_cost_usd), 0) as estimated_cost
    FROM sessions WHERE {prev_where}
""", prev_params)
prev_overview = dict(cur.fetchone())

result["overview"]["trends"] = {
    "sessions": compute_trend(row["total_sessions"], prev_overview["sessions"]),
    "total_tokens": compute_trend(row["total_tokens"], prev_overview["total_tokens"]),
    "tool_calls": compute_trend(row["total_tool_calls"], prev_overview["tool_calls"]),
    "estimated_cost": compute_trend(row["total_estimated_cost"], prev_overview["estimated_cost"]),
}
```

**Step 3: Add trend badges to stat cards**

```typescript
// Inside StatCards — add TrendBadge sub-component
function TrendBadge({ trend, label }: { trend: TrendData; label: string }) {
  if (trend.changePercent === null) return null;
  const arrow = trend.isUp ? '↑' : '↓';
  const color = trend.isUp ? 'var(--success)' : 'var(--danger)';
  return (
    <span style={{ fontSize: 11, color, marginLeft: 6 }}>
      {arrow} {Math.abs(trend.changePercent).toFixed(0)}%
    </span>
  );
}
```

**Step 4: Commit**

```bash
git add scripts/query_analytics.py src/lib/types.ts src/components/StatCards.tsx
git commit -m "feat: add trend comparison indicators to stat cards"
```

---

### Task 7: Make session table sortable

**Objective:** Click column headers to sort by that column.

**Files:**
- Create: `src/hooks/useSortableData.ts`
- Modify: `src/components/SessionTable.tsx`

**Step 1: Create sort hook**

```typescript
// src/hooks/useSortableData.ts
'use client';
import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc';

interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export function useSortableData<T extends Record<string, any>>(
  data: T[],
  defaultKey: keyof T = 'total_tokens' as keyof T,
  defaultDirection: SortDirection = 'desc',
) {
  const [sort, setSort] = useState<SortConfig<T>>({ key: defaultKey, direction: defaultDirection });

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sort.key] ?? 0;
      const bVal = b[sort.key] ?? 0;
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sort]);

  const toggleSort = (key: keyof T) => {
    setSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return { sorted, sort, toggleSort };
}
```

**Step 2: Add sort indicators to column headers**

```typescript
function SortHeader({ label, field, sort, onToggle }: {
  label: string; field: string; sort: { key: string; direction: string }; onToggle: (f: string) => void;
}) {
  const isActive = sort.key === field;
  return (
    <th onClick={() => onToggle(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label} {isActive ? (sort.direction === 'asc' ? '▲' : '▼') : ' '}
    </th>
  );
}
```

**Step 3: Commit**

```bash
git add src/hooks/useSortableData.ts src/components/SessionTable.tsx
git commit -m "feat: sortable session table with column headers"
```

---

## Phase 4: Session Detail

### Task 8: Add session drill-down modal

**Objective:** Click a session row to see its details — messages, tool calls, timeline.

**Files:**
- Create: `src/components/SessionDetailModal.tsx`
- Modify: `src/components/SessionTable.tsx` — add click handler, open modal
- Modify: `scripts/query_analytics.py` — add session detail endpoint (or add a second API route)

**Approach:** Add a new API route `/api/analytics/session?id=xxx` that returns messages and tool calls for a specific session. The modal overlays the dashboard with that data.

**Step 1: Add session detail query to Python script**

```python
# New API route: /api/analytics/session?id=xxx
# Or add a --session-id flag to query_analytics.py
```

**Step 2: Build modal with messages list**

- Messages in chronological order
- Color-coded by role (user = blue, assistant = green, tool = gray)
- Show token count per message
- Tool calls expandable inline

**Step 3: Commit**

```bash
git add src/components/SessionDetailModal.tsx src/app/api/analytics/session/route.ts
git commit -m "feat: session detail drill-down modal with messages and tool calls"
```

---

## Phase 5: UX Polish

### Task 9: Add responsive layout for mobile

**Objective:** The 2-column grid collapses to single column on narrow viewports. Stat cards adapt to 2-column on mobile.

**Files:**
- Modify: `src/app/globals.css` — add media queries
- Modify: DashboardShell — use CSS Grid with responsive column count

**Step 1: Add responsive grid**

```css
/* In globals.css */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-cards-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: responsive mobile layout for dashboard"
```

---

### Task 10: Add skeleton loading states per section

**Objective:** Instead of a single full-page spinner, show skeleton cards that animate while data loads.

**Files:**
- Create: `src/components/SkeletonCard.tsx`

**Step 1: Create skeleton component**

```typescript
export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div className="card" style={{ height, animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ width: '40%', height: 14, borderRadius: 4, background: '#2a2a35', marginBottom: 12 }} />
      <div style={{ width: '60%', height: 28, borderRadius: 6, background: '#1e1e28' }} />
    </div>
  );
}
```

```css
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}
```

**Step 2: Render skeletons during loading** (but after initial data, show stale data with a spinner overlay instead).

**Step 3: Commit**

---

### Task 11: Add export-to-CSV

**Objective:** Download the current filtered data as CSV.

**Files:**
- Create: `src/lib/export.ts`
- Modify: `src/components/DashboardHeader.tsx` — add Export button

**Step 1: CSV export utility**

```typescript
// src/lib/export.ts
export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 2: Add Export button** in the header that downloads the current filter state as `hermes-analytics-{date}.csv`.

**Step 3: Commit**

---

### Task 12: Cache API responses with proper headers

**Objective:** Add `Cache-Control` and `ETag` headers to reduce repeated Python script calls.

**Files:**
- Modify: `src/app/api/analytics/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // ... existing code ...
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return response;
}
```

**Step 1: Commit**

---

## Phase 6: Data Completeness

### Task 13: Display messages_by_role chart

**Objective:** Render the `messages_by_role` data that's fetched but never shown.

**Files:**
- Create: `src/components/RoleBreakdown.tsx`
- Modify: layout — add to grid

**Step 1: Simple horizontal bar chart or table** showing role, message count, token count.

**Step 2: Commit**

---

## Verification Checklist

- [ ] `npm run build` passes with zero errors
- [ ] `npm run dev` loads dashboard on `localhost:3000`
- [ ] Filters persist in URL on page reload
- [ ] Heatmap renders with color gradient
- [ ] Trend arrows appear on stat cards
- [ ] Session table columns sort on click
- [ ] Session detail modal opens on row click
- [ ] Export button downloads CSV
- [ ] Layout collapses to single column on mobile viewport (< 768px)
- [ ] Skeleton cards show during loading
- [ ] Role breakdown renders

---

## Risks & Tradeoffs

| Risk | Mitigation |
|------|------------|
| `useSearchParams` requires Suspense boundary | Already handled in Task 4 — shell component pattern |
| Python script now does 2 queries (current + previous period) | Acceptable; still < 200ms on typical state.db |
| Component decomposition may introduce prop-drilling | Mitigated by co-locating derived data computation in each component |
| Heatmap 7×24 grid could be dense | Already accounted for — compact design with tooltips |
| Session detail modal needs its own API call | Minor — new route, stateless |