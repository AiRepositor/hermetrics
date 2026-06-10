# Hermetrics

<p align="center">
  <img src="assets/screenshot.png" alt="Hermetrics Dashboard" width="800">
</p>

<p align="center">
  <b>Beautiful token usage analytics for Hermes Agent.</b> Track every token, every dollar, every session — in a single dashboard.<br>
  <em>Zero config. One command. Works offline.</em>
</p>

<p align="center">
  <a href="https://github.com/AiRepositor/hermetrics/actions"><img src="https://img.shields.io/github/actions/workflow/status/AiRepositor/hermetrics/deploy.yml?label=deploy" alt="Deploy"></a>
  <a href="https://github.com/AiRepositor/hermetrics"><img src="https://img.shields.io/github/stars/AiRepositor/hermetrics?style=social" alt="Stars"></a>
</p>

---

## Quick Start

```bash
npx degit AiRepositor/hermetrics hermetrics
cd hermetrics && npm install && npm run dev
```

Open `http://localhost:3000` — the dashboard loads your Hermes data from `~/.hermes/state.db`.

## Features

| Feature | |
|---|---|
| **📊 Live token tracking** | Input, output, cache reads, reasoning tokens |
| **💰 Cost monitoring** | Estimated & actual cost per model, per day |
| **📈 Time series charts** | Hourly · Daily · Weekly — with zoom/brush |
| **🔥 Activity heatmap** | See your busiest hours at a glance (day × hour matrix) |
| **📉 Trend indicators** | ↑↓ % change vs previous period on every stat |
| **🤖 Model breakdown** | Donut chart + legend — who's eating your tokens? |
| **🔧 Tool analytics** | Ranked tool usage with proportion bars |
| **🔗 Session inspector** | Click any session → drill into messages and tool calls |
| **🔍 Sortable tables** | Click column headers to rank sessions by tokens, cost, messages |
| **📱 Responsive** | Works on desktop, tablet, and phone |
| **📤 CSV export** | Download filtered data with one click |
| **🔗 Shareable URLs** | Filters persist in the URL — `/`?days=7&model=deepseek-v4-pro |
| **🧪 Live demo mode** | No state.db? No problem — sample data loads automatically |

## Architecture

```
~/.hermes/state.db  →  scripts/query_analytics.py  →  /api/analytics  →  React dashboard
       (read-only)         (SQL → JSON)               (Next.js route)     (Recharts + Lucide)
```

**Zero writes.** The Python script only runs `SELECT` queries against Hermes' state database.

## Customize

```bash
# Date range
http://localhost:3000/?days=90

# Granularity
http://localhost:3000/?granularity=hour

# Filter by model
http://localhost:3000/?model=deepseek-v4-flash

# Combine
http://localhost:3000/?days=30&granularity=day&model=gpt-5.3-codex
```

## Deploy

### GitHub Pages (free)

Push to `main` — the included GitHub Action builds and deploys to `AiRepositor.github.io/hermetrics`.

### Self-hosted

```bash
npm run build && npm start
```

## Compared to

| | Hermetrics | Langfuse | Helicone | Manual `grep` |
|---|---|---|---|---|
| **Setup** | 1 command | Docker + DB | API keys | — |
| **Cost** | Free | Free tier | Free tier | Free |
| **Data stays local** | ✅ | ❌ | ❌ | ✅ |
| **Model breakdown** | ✅ | ✅ | ✅ | ❌ |
| **Session drill-down** | ✅ | ✅ | ✅ | ❌ |
| **Activity heatmap** | ✅ | ❌ | ❌ | ❌ |
| **Trend comparison** | ✅ | ✅ | ✅ | ❌ |
| **No account needed** | ✅ | ❌ | ❌ | ✅ |
| **No internet required** | ✅ | ❌ | ❌ | ✅ |

## License

MIT
