# Hermes Token Analytics

A live analytics dashboard for [Hermes Agent](https://github.com/NousResearch/hermes-agent) token usage, built with Next.js 16.

## Features

- **Token usage over time** — daily/weekly area chart with input/output breakdown
- **Model breakdown** — pie chart showing token distribution across models
- **Activity patterns** — day-of-week bar chart, hourly distribution
- **Cost tracking** — estimated cost over time (for paid models)
- **Top tools** — ranked tool usage with percentage bars
- **Top sessions** — expandable table sorted by token consumption
- **Session sources** — breakdown by entry point (CLI, gateway, etc.)
- **Filters** — date range (7/14/30/90 days), granularity (daily/weekly), model selector
- **Live refresh** — always reads fresh data from state.db

## How It Works

The dashboard reads directly from Hermes' SQLite session store at `~/.hermes/state.db` (read-only) via a Python script called from the Next.js API route. No database writes, no external dependencies — just your local Hermes data.

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 16** (App Router)
- **Recharts** — composable chart library
- **Tailwind CSS 4** — styling
- **Lucide React** — icons
- **Python 3** — SQLite querying via `sqlite3` stdlib

## Requirements

- Node.js 18+
- Python 3 (with `sqlite3` stdlib module)
- Hermes Agent with an existing session database (`~/.hermes/state.db`)
