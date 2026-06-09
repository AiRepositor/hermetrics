#!/usr/bin/env python3
"""Query Hermes state.db for token usage analytics."""
import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta

DB_PATH = os.path.expanduser("~/.hermes/state.db")


def main():
    filters = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    result = {}

    # --- Overview ---
    cur.execute("""
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
    """)
    row = dict(cur.fetchone())
    row["total_tokens"] = row["total_input_tokens"] + row["total_output_tokens"]
    result["overview"] = row

    # --- Model breakdown ---
    cur.execute("""
        SELECT
            model,
            COUNT(*) as sessions,
            SUM(input_tokens + output_tokens) as total_tokens,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(estimated_cost_usd) as estimated_cost
        FROM sessions
        WHERE model IS NOT NULL
        GROUP BY model
        ORDER BY SUM(input_tokens + output_tokens) DESC
    """)
    result["models"] = [dict(r) for r in cur.fetchall()]

    # --- Daily breakdown ---
    cur.execute("""
        SELECT
            date(started_at, 'unixepoch') as day,
            COUNT(*) as sessions,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(estimated_cost_usd) as estimated_cost
        FROM sessions
        GROUP BY day
        ORDER BY day ASC
    """)
    result["daily"] = [dict(r) for r in cur.fetchall()]

    # --- Hourly breakdown ---
    cur.execute("""
        SELECT
            CAST(strftime('%H', started_at, 'unixepoch') AS INTEGER) as hour,
            COUNT(*) as sessions,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens
        FROM sessions
        GROUP BY hour
        ORDER BY hour ASC
    """)
    result["hourly"] = [dict(r) for r in cur.fetchall()]

    # --- Day of week ---
    cur.execute("""
        SELECT
            CAST(strftime('%w', started_at, 'unixepoch') AS INTEGER) as dow,
            COUNT(*) as sessions,
            SUM(input_tokens + output_tokens) as total_tokens
        FROM sessions
        GROUP BY dow
        ORDER BY dow ASC
    """)
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    dow_data = [dict(r) for r in cur.fetchall()]
    for d in dow_data:
        d["day_name"] = days[d["dow"]]
    result["day_of_week"] = dow_data

    # --- Hourly heatmap (24h * day) ---
    cur.execute("""
        SELECT
            CAST(strftime('%w', started_at, 'unixepoch') AS INTEGER) as dow,
            CAST(strftime('%H', started_at, 'unixepoch') AS INTEGER) as hour,
            SUM(input_tokens + output_tokens) as total_tokens,
            COUNT(*) as sessions
        FROM sessions
        GROUP BY dow, hour
        ORDER BY dow, hour
    """)
    heatmap = {}
    for r in cur.fetchall():
        key = f"{r[0]}_{r[1]}"
        heatmap[key] = {"total_tokens": r[2], "sessions": r[3]}
    result["heatmap"] = heatmap

    # --- Weekly breakdown ---
    cur.execute("""
        SELECT
            CAST(strftime('%W', started_at, 'unixepoch') AS INTEGER) as week,
            COUNT(*) as sessions,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens
        FROM sessions
        GROUP BY week
        ORDER BY week ASC
    """)
    result["weekly"] = [dict(r) for r in cur.fetchall()]

    # --- Top sessions ---
    cur.execute("""
        SELECT id, title, model, started_at, input_tokens, output_tokens,
               (input_tokens + output_tokens) as total_tokens,
               message_count, tool_call_count, estimated_cost_usd
        FROM sessions
        ORDER BY (input_tokens + output_tokens) DESC
        LIMIT 20
    """)
    result["top_sessions"] = [dict(r) for r in cur.fetchall()]

    # --- Messages by role (last 1000 for sample) ---
    cur.execute("""
        SELECT role, COUNT(*) as count, SUM(token_count) as total_tokens
        FROM messages
        WHERE token_count IS NOT NULL
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

    # --- Top skills (from session titles mentioning skills) ---
    # Skills data isn't directly in the DB schema, but we can infer from titles

    # --- Cost over time ---
    cur.execute("""
        SELECT
            date(started_at, 'unixepoch') as day,
            SUM(estimated_cost_usd) as estimated_cost,
            SUM(actual_cost_usd) as actual_cost
        FROM sessions
        WHERE estimated_cost_usd > 0 OR actual_cost_usd > 0
        GROUP BY day
        ORDER BY day ASC
    """)
    result["cost_daily"] = [dict(r) for r in cur.fetchall()]

    # --- Session duration stats ---
    cur.execute("""
        SELECT
            AVG(CASE WHEN ended_at IS NOT NULL THEN (ended_at - started_at) ELSE NULL END) as avg_duration,
            MAX(CASE WHEN ended_at IS NOT NULL THEN (ended_at - started_at) ELSE 0 END) as max_duration
        FROM sessions
    """)
    dur = dict(cur.fetchone())
    result["duration_stats"] = {
        "avg_duration_seconds": dur["avg_duration"],
        "max_duration_seconds": dur["max_duration"],
    }

    # --- Source breakdown ---
    cur.execute("""
        SELECT source, COUNT(*) as sessions,
               SUM(input_tokens + output_tokens) as total_tokens
        FROM sessions
        WHERE source IS NOT NULL
        GROUP BY source
        ORDER BY sessions DESC
    """)
    result["sources"] = [dict(r) for r in cur.fetchall()]

    conn.close()
    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
