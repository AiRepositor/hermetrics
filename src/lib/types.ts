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
  prev_overview?: { sessions: number; total_tokens: number; tool_calls: number; estimated_cost: number };
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
  messages_by_role: { role: string; count: number; total_tokens: number }[];
}
