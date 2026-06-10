import type { AnalyticsData } from '@/lib/types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function heatmapKey(dow: number, hour: number): string {
  return `${dow}-${hour}`;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Generate realistic sample data ───

const DAYS = 30;
const rand = seededRandom(42);

const models = [
  { name: 'deepseek-v4-flash', weight: 0.35, priceIn: 0.27, priceOut: 1.10 },
  { name: 'deepseek-v4-pro', weight: 0.30, priceIn: 0.55, priceOut: 2.19 },
  { name: 'gpt-5.3-codex', weight: 0.20, priceIn: 3.00, priceOut: 15.00 },
  { name: 'kimi-k2.6', weight: 0.15, priceIn: 0.40, priceOut: 0.40 },
];

const toolNames = [
  'read_file', 'terminal', 'search_files', 'write_file', 'patch',
  'process', 'vision_analyze',
];

const roleTypes = ['user', 'assistant', 'tool'];

// ─── Daily data ───
const daily = [];
let cumulativeInput = 0;
let cumulativeOutput = 0;
let cumulativeCost = 0;
let cumulativeSessions = 0;

for (let d = DAYS - 1; d >= 0; d--) {
  const dayName = dateStr(d);
  const dow = new Date(dayName + 'T12:00:00Z').getUTCDay();
  const weekendMul = (dow === 0 || dow === 6) ? 0.3 : 1.0;
  const sessions = Math.round((3 + rand() * 10) * weekendMul);
  const inputTokens = Math.round((10000 + rand() * 60000) * weekendMul);
  const outputTokens = Math.round((3000 + rand() * 20000) * weekendMul);
  const estCost = (inputTokens / 1_000_000 * 1.5 + outputTokens / 1_000_000 * 8) * (0.8 + rand() * 0.4);

  cumulativeInput += inputTokens;
  cumulativeOutput += outputTokens;
  cumulativeCost += estCost;
  cumulativeSessions += sessions;

  daily.push({
    day: dayName,
    sessions,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: Math.round(estCost * 100) / 100,
  });
}

// ─── Hourly data ───
const hourly = [];
for (let h = 0; h < 24; h++) {
  const baseMod = h >= 8 && h <= 18 ? 1.0 : (h >= 19 && h <= 22 ? 0.6 : 0.15);
  hourly.push({
    hour: h,
    sessions: Math.round((3 + rand() * 7) * baseMod),
    input_tokens: Math.round((5000 + rand() * 40000) * baseMod),
    output_tokens: Math.round((1500 + rand() * 15000) * baseMod),
  });
}

// ─── Hourly timeseries (last 24h) ───
const hourly_timeseries = [];
const now = new Date();
for (let h = 23; h >= 0; h--) {
  const ts = new Date(now.getTime() - h * 3600_000);
  const hourTS = ts.toISOString().slice(0, 13) + ':00:00';
  const baseMod = ts.getUTCHours() >= 8 && ts.getUTCHours() <= 18 ? 1.0 : 0.3;
  hourly_timeseries.push({
    hour_ts: hourTS,
    sessions: Math.round((0.5 + rand() * 2) * baseMod),
    input_tokens: Math.round((2000 + rand() * 15000) * baseMod),
    output_tokens: Math.round((500 + rand() * 5000) * baseMod),
  });
}

// ─── Day of week ───
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const day_of_week = dayNames.map((day_name, dow) => {
  const mul = (dow === 0 || dow === 6) ? 0.3 : 1.0;
  return {
    dow,
    day_name,
    sessions: Math.round((7 + rand() * 18) * mul),
    total_tokens: Math.round((30000 + rand() * 80000) * mul),
  };
});

// ─── Weekly ───
const weekly = [];
for (let w = 0; w < 4; w++) {
  const s = Math.round(30 + rand() * 40);
  const input = Math.round(200000 + rand() * 400000);
  const output = Math.round(80000 + rand() * 150000);
  weekly.push({
    week: w + 1,
    sessions: s,
    input_tokens: input,
    output_tokens: output,
    total_tokens: input + output,
  });
}

// ─── Model stats ───
const modelStats = models.map(m => {
  const sessions = Math.round(cumulativeSessions * m.weight * (0.7 + rand() * 0.6));
  const input = Math.round(cumulativeInput * m.weight * (0.8 + rand() * 0.4));
  const output = Math.round(cumulativeOutput * m.weight * (0.8 + rand() * 0.4));
  return {
    model: m.name,
    sessions,
    total_tokens: input + output,
    input_tokens: input,
    output_tokens: output,
    estimated_cost: Math.round((input / 1_000_000 * m.priceIn + output / 1_000_000 * m.priceOut) * 100) / 100,
  };
});

// Normalize model stats to match cumulative
const modelTotalTokens = modelStats.reduce((s, m) => s + m.total_tokens, 0);
const modelTotalSessions = modelStats.reduce((s, m) => s + m.sessions, 0);
modelStats.forEach(m => {
  m.total_tokens = Math.round(m.total_tokens / modelTotalTokens * (cumulativeInput + cumulativeOutput));
  m.sessions = Math.round(m.sessions / modelTotalSessions * cumulativeSessions);
});

// ─── Heatmap (7×24) ───
const heatmap: Record<string, { total_tokens: number; sessions: number }> = {};
for (let dow = 0; dow < 7; dow++) {
  const weekendMul = (dow === 0 || dow === 6) ? 0.2 : 1.0;
  for (let h = 0; h < 24; h++) {
    const hourMul = h >= 9 && h <= 17 ? 1.0 : (h >= 6 && h <= 22 ? 0.5 : 0.1);
    heatmap[heatmapKey(dow, h)] = {
      total_tokens: Math.round((1000 + rand() * 30000) * weekendMul * hourMul),
      sessions: Math.round((0.5 + rand() * 4) * weekendMul * hourMul),
    };
  }
}

// ─── Top sessions ───
const sessionNames = [
  'Refactor authentication middleware',
  'Build CI/CD pipeline for Next.js',
  'Debug memory leak in worker threads',
  'Add dark mode to dashboard',
  'Implement rate limiting',
  'Write unit tests for API routes',
  'Optimize database queries',
  'Configure WebSocket server',
  'Migrate to TypeScript strict mode',
  'Create data export feature',
  'Fix responsive layout on mobile',
  'Add PWA offline support',
];

const top_sessions = [];
for (let i = 0; i < 20; i++) {
  const model = models[Math.floor(rand() * models.length)];
  const startedAt = Math.floor(now.getTime() / 1000) - Math.floor(rand() * DAYS * 86400);
  const tokens = Math.round(5000 + rand() * 80000);
  const msgCount = Math.round(5 + rand() * 60);
  top_sessions.push({
    id: `sample-${String(i).padStart(4, '0')}`,
    title: sessionNames[i % sessionNames.length],
    model: model.name,
    started_at: startedAt,
    input_tokens: Math.round(tokens * 0.6),
    output_tokens: Math.round(tokens * 0.4),
    total_tokens: tokens,
    message_count: msgCount,
    tool_call_count: Math.round(msgCount * (0.3 + rand() * 0.7)),
    estimated_cost_usd: Math.round(tokens / 1_000_000 * (model.priceIn * 0.6 + model.priceOut * 0.4) * 100) / 100,
  });
}

// ─── Top tools ───
const top_tools = toolNames.map(name => ({
  tool_name: name,
  calls: Math.round(20 + rand() * 200),
})).sort((a, b) => b.calls - a.calls);

// ─── Cost daily ───
const cost_daily = daily.map(d => ({
  day: d.day,
  estimated_cost: d.estimated_cost,
  actual_cost: Math.round(d.estimated_cost * (0.7 + rand() * 0.3) * 100) / 100,
}));

// ─── Sources ───
const sources = [
  { source: 'VS Code extension', sessions: Math.round(cumulativeSessions * 0.45), total_tokens: Math.round((cumulativeInput + cumulativeOutput) * 0.45) },
  { source: 'CLI', sessions: Math.round(cumulativeSessions * 0.35), total_tokens: Math.round((cumulativeInput + cumulativeOutput) * 0.35) },
  { source: 'Web UI', sessions: Math.round(cumulativeSessions * 0.15), total_tokens: Math.round((cumulativeInput + cumulativeOutput) * 0.15) },
  { source: 'API', sessions: Math.round(cumulativeSessions * 0.05), total_tokens: Math.round((cumulativeInput + cumulativeOutput) * 0.05) },
];

// ─── Duration stats ───
const duration_stats = {
  avg_duration_seconds: Math.round(120 + rand() * 300),
  max_duration_seconds: Math.round(600 + rand() * 1200),
};

// ─── Messages by role ───
const messages_by_role = [
  { role: 'user', count: Math.round(cumulativeSessions * 8), total_tokens: Math.round(cumulativeInput * 0.3) },
  { role: 'assistant', count: Math.round(cumulativeSessions * 7), total_tokens: Math.round(cumulativeOutput * 0.7) },
  { role: 'tool', count: Math.round(cumulativeSessions * 12), total_tokens: Math.round((cumulativeInput + cumulativeOutput) * 0.15) },
];

// ─── Overview ───
const overview = {
  total_sessions: cumulativeSessions,
  total_messages: messages_by_role.reduce((s, r) => s + r.count, 0),
  total_input_tokens: cumulativeInput,
  total_output_tokens: cumulativeOutput,
  total_tokens: cumulativeInput + cumulativeOutput,
  total_tool_calls: top_tools.reduce((s, t) => s + t.calls, 0),
  total_cache_read: Math.round((cumulativeInput + cumulativeOutput) * 0.15),
  total_cache_write: Math.round((cumulativeInput + cumulativeOutput) * 0.08),
  total_reasoning_tokens: Math.round(cumulativeOutput * 0.12),
  total_estimated_cost: Math.round(cumulativeCost * 100) / 100,
  total_actual_cost: Math.round(cumulativeCost * 0.75 * 100) / 100,
  first_session: Math.floor(Date.now() / 1000) - DAYS * 86400,
  last_session: Math.floor(Date.now() / 1000) - Math.floor(rand() * 3600),
};

// ─── Previous period overview (for comparison) ───
const prev_overview = {
  sessions: Math.round(cumulativeSessions * 0.85),
  total_tokens: Math.round((cumulativeInput + cumulativeOutput) * 0.72),
  tool_calls: Math.round(top_tools.reduce((s, t) => s + t.calls, 0) * 0.8),
  estimated_cost: Math.round(cumulativeCost * 0.68 * 100) / 100,
};

export const sampleData: AnalyticsData = {
  overview,
  prev_overview,
  models: modelStats,
  daily,
  hourly,
  hourly_timeseries,
  day_of_week,
  weekly,
  top_sessions,
  top_tools,
  cost_daily,
  sources,
  heatmap,
  duration_stats,
  messages_by_role,
};
