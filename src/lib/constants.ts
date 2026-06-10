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
