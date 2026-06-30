#!/usr/bin/env python3
"""Query Hermes state.db for token usage analytics."""
import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta

DB_PATH = os.path.expanduser("~/.hermes/state.db")


def build_where(filters):
    """Build WHERE clause and params from filters dict."""
    clauses = []
    params = []

    days = filters.get("days", 365 * 10)
    cutoff_ts = int((datetime.now() - timedelta(days=days)).timestamp())
    clauses.append("started_at >= ?")
    params.append(cutoff_ts)

    model = filters.get("model")
    if model:
        clauses.append("model = ?")
        params.append(model)

    return " AND ".join(clauses), params, cutoff_ts


def main():
    # Check for --session-id flag
    if '--session-id' in sys.argv:
        idx = sys.argv.index('--session-id')
        if idx + 1 >= len(sys.argv):
            print(json.dumps({"error": "Missing session id argument"}))
            sys.exit(1)
        session_id = sys.argv[idx + 1]
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT id, role, content, token_count, tool_name, tool_calls, timestamp
            FROM messages WHERE session_id = ? ORDER BY timestamp ASC
        """, [session_id])
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        print(json.dumps(rows, default=str))
        return

    filters = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    where_clause, where_params, cutoff_ts = build_where(filters)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    result = {}

    # --- Overview ---
    cur.execute(f"""
        SELECT
            COUNT(*) as total_sessions,
            COALESCE(SUM(message_count), 0) as total_messages,
            COALESCE(SUM(input_tokens), 0) as total_input_tokens,
            COALESCE(SUM(output_tokens), 0) as total_output_tokens,
            COALESCE(SUM(tool_call_count), 0) as total_tool_calls,
            COALESCE(SUM(cache_read_tokens), 0) as total_cache_read,
            COALESCE(SUM(cache_write_tokens), 0) as total_cache_write,
            COALESCE(SUM(reasoning_tokens), 0) as total_reasoning_tokens,
            COALESCE(SUM(estimated_cost_usd), 0) as total_estimated_cost,
            COALESCE(SUM(actual_cost_usd), 0) as total_actual_cost,
            MIN(started_at) as first_session,
            MAX(started_at) as last_session
        FROM sessions
        WHERE {where_clause}
    """, where_params)
    row = dict(cur.fetchone())
    row["total_tokens"] = row["total_input_tokens"] + row["total_output_tokens"]
    result["overview"] = row

    # --- Previous period overview (equal length) ---
    now_ts = int(datetime.now().timestamp())
    period_length = now_ts - cutoff_ts
    prev_cutoff = cutoff_ts - period_length
    prev_params = where_params.copy()
    prev_params[0] = prev_cutoff  # started_at >= prev_cutoff
    cur.execute(f"""
        SELECT
            COUNT(*) as sessions,
            COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
            COALESCE(SUM(tool_call_count), 0) as tool_calls,
            COALESCE(SUM(estimated_cost_usd), 0) as estimated_cost
        FROM sessions
        WHERE started_at >= ? AND started_at < ?
    """, [prev_cutoff, cutoff_ts])
    prev_row = dict(cur.fetchone())
    result["prev_overview"] = prev_row

    # --- Model breakdown ---
    cur.execute(f"""
        SELECT
            model,
            COUNT(*) as sessions,
            SUM(input_tokens + output_tokens) as total_tokens,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(estimated_cost_usd) as estimated_cost
        FROM sessions
        WHERE model IS NOT NULL AND {where_clause}
        GROUP BY model
        ORDER BY SUM(input_tokens + output_tokens) DESC
    """, where_params)
    result["models"] = [dict(r) for r in cur.fetchall()]

    # --- Daily breakdown ---
    cur.execute(f"""
        SELECT
            date(started_at, 'unixepoch') as day,
            COUNT(*) as sessions,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(estimated_cost_usd) as estimated_cost
        FROM sessions
        WHERE {where_clause}
        GROUP BY day
        ORDER BY day ASC
    """, where_params)
    result["daily"] = [dict(r) for r in cur.fetchall()]

    # --- Hourly breakdown (by hour-of-day, aggregated) ---
    cur.execute(f"""
        SELECT
            CAST(strftime('%H', started_at, 'unixepoch') AS INTEGER) as hour,
            COUNT(*) as sessions,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens
        FROM sessions
        WHERE {where_clause}
        GROUP BY hour
        ORDER BY hour ASC
    """, where_params)
    result["hourly"] = [dict(r) for r in cur.fetchall()]

    # --- Hourly time series (actual hour-by-hour) ---
    cur.execute(f"""
        SELECT
            strftime('%Y-%m-%d %H:00', started_at, 'unixepoch') as hour_ts,
            COUNT(*) as sessions,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens
        FROM sessions
        WHERE {where_clause}
        GROUP BY hour_ts
        ORDER BY hour_ts ASC
    """, where_params)
    result["hourly_timeseries"] = [dict(r) for r in cur.fetchall()]

    # --- Day of week ---
    cur.execute(f"""
        SELECT
            CAST(strftime('%w', started_at, 'unixepoch') AS INTEGER) as dow,
            COUNT(*) as sessions,
            SUM(input_tokens + output_tokens) as total_tokens
        FROM sessions
        WHERE {where_clause}
        GROUP BY dow
        ORDER BY dow ASC
    """, where_params)
    days_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    dow_data = [dict(r) for r in cur.fetchall()]
    for d in dow_data:
        d["day_name"] = days_names[d["dow"]]
    result["day_of_week"] = dow_data

    # --- Hourly heatmap (24h * day) ---
    cur.execute(f"""
        SELECT
            CAST(strftime('%w', started_at, 'unixepoch') AS INTEGER) as dow,
            CAST(strftime('%H', started_at, 'unixepoch') AS INTEGER) as hour,
            SUM(input_tokens + output_tokens) as total_tokens,
            COUNT(*) as sessions
        FROM sessions
        WHERE {where_clause}
        GROUP BY dow, hour
        ORDER BY dow, hour
    """, where_params)
    heatmap = {}
    for r in cur.fetchall():
        key = f"{r[0]}_{r[1]}"
        heatmap[key] = {"total_tokens": r[2], "sessions": r[3]}
    result["heatmap"] = heatmap

    # --- Weekly breakdown ---
    cur.execute(f"""
        SELECT
            CAST(strftime('%W', started_at, 'unixepoch') AS INTEGER) as week,
            COUNT(*) as sessions,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens
        FROM sessions
        WHERE {where_clause}
        GROUP BY week
        ORDER BY week ASC
    """, where_params)
    result["weekly"] = [dict(r) for r in cur.fetchall()]

    # --- Top sessions ---
    cur.execute(f"""
        SELECT id, title, model, started_at, input_tokens, output_tokens,
               (input_tokens + output_tokens) as total_tokens,
               message_count, tool_call_count, estimated_cost_usd
        FROM sessions
        WHERE {where_clause}
        ORDER BY (input_tokens + output_tokens) DESC
        LIMIT 20
    """, where_params)
    result["top_sessions"] = [dict(r) for r in cur.fetchall()]

    # --- Messages by role (last 1000 for sample) ---
    cur.execute("""
        SELECT role, COUNT(*) as count, COALESCE(SUM(token_count), 0) as total_tokens
        FROM messages
        GROUP BY role
    """)
    result["messages_by_role"] = [dict(r) for r in cur.fetchall()]

    # --- Tool usage ---
    cur.execute("""
        SELECT tool_name, COUNT(*) as calls
        FROM messages
        WHERE tool_name IS NOT NULL AND tool_name != ''
        GROUP BY tool_name
        ORDER BY calls DESC
        LIMIT 20
    """)
    result["top_tools"] = [dict(r) for r in cur.fetchall()]

    # --- Cost over time ---
    cur.execute(f"""
        SELECT
            date(started_at, 'unixepoch') as day,
            SUM(estimated_cost_usd) as estimated_cost,
            SUM(actual_cost_usd) as actual_cost
        FROM sessions
        WHERE (estimated_cost_usd > 0 OR actual_cost_usd > 0) AND {where_clause}
        GROUP BY day
        ORDER BY day ASC
    """, where_params)
    result["cost_daily"] = [dict(r) for r in cur.fetchall()]

    # --- Session duration stats ---
    cur.execute(f"""
        SELECT
            AVG(CASE WHEN ended_at IS NOT NULL THEN (ended_at - started_at) ELSE NULL END) as avg_duration,
            MAX(CASE WHEN ended_at IS NOT NULL THEN (ended_at - started_at) ELSE 0 END) as max_duration
        FROM sessions
        WHERE {where_clause}
    """, where_params)
    dur = dict(cur.fetchone())
    result["duration_stats"] = {
        "avg_duration_seconds": dur["avg_duration"],
        "max_duration_seconds": dur["max_duration"],
    }

    # --- Source breakdown ---
    cur.execute(f"""
        SELECT source, COUNT(*) as sessions,
               SUM(input_tokens + output_tokens) as total_tokens
        FROM sessions
        WHERE source IS NOT NULL AND {where_clause}
        GROUP BY source
        ORDER BY sessions DESC
    """, where_params)
    result["sources"] = [dict(r) for r in cur.fetchall()]

    conn.close()
    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
