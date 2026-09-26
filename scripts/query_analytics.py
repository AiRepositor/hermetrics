#!/usr/bin/env python3
"""Query Hermes state.db for token usage analytics."""
import glob
import re
import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta

def _hermes_root():
    """Real Hermes home, even when HERMES_HOME points at a named profile dir.

    Under a named profile (e.g. 'local'), the process env may set
    HERMES_HOME=~/.hermes/profiles/local. Climb out of any trailing
    /profiles/<name> so discovery covers the default DB and all profiles."""
    home = os.environ.get("HERMES_HOME") or os.path.expanduser("~/.hermes")
    p = os.path.abspath(home)
    while os.path.basename(os.path.dirname(p)) == "profiles":
        p = os.path.dirname(os.path.dirname(p))
    return p


def _find_db_paths():
    """All state.db files to merge: default profile first, then each named profile."""
    hermes_home = _hermes_root()
    dbs = [os.path.join(hermes_home, "state.db")]
    profiles_dir = os.path.join(hermes_home, "profiles")
    if os.path.isdir(profiles_dir):
        for name in sorted(os.listdir(profiles_dir)):
            candidate = os.path.join(profiles_dir, name, "state.db")
            if os.path.isfile(candidate):
                dbs.append(candidate)
    seen = set()
    out = []
    for d in dbs:
        rp = os.path.realpath(d)
        if rp not in seen and os.path.isfile(d):
            seen.add(rp)
            out.append(d)
    return out


def _db_label(db_path, hermes_home):
    """Human label: 'default' or the profile directory name."""
    rel = os.path.relpath(db_path, hermes_home)
    parts = rel.split(os.sep)  # ['state.db'] or ['profiles', '<name>', 'state.db']
    if len(parts) == 3 and parts[0] == "profiles":
        return f"profile:{parts[1]}"
    return "default"


_API_CALL_RE = re.compile(
    r"\[(?P<sid>[^\]\s]+)\] agent\.conversation_loop: API call #\d+: model=(?P<model>\S+) .*?"
    r"\bin=(?P<prompt>\d+) out=(?P<out>\d+)"
    r"(?:.*?\bcache=(?P<cr>\d+)/\d+)?(?:.*?\bwrite=(?P<cw>\d+))?"
)


def _log_usage(db_path):
    """Per-session usage summed from the `API call #N: ... in= out=` lines Hermes writes to
    <profile>/logs/agent.log* for every provider response.

    state.db's session counters can fall short of this (the gateway path *overwrites* them with
    the live agent's cumulative totals, so an agent rebuilt mid-session loses earlier usage, and
    some sessions never get usage written at all). `in=` is the full prompt incl. cache; it is
    split back into Hermes' canonical uncached `input_tokens` = prompt - cache_read - cache_write.

    Returns {session_id: (calls, input, output, cache_read, cache_write, last_model)}."""
    usage = {}
    for path in sorted(glob.glob(os.path.join(os.path.dirname(db_path), "logs", "agent.log*"))):
        try:
            with open(path, errors="ignore") as f:
                for line in f:
                    if "API call #" not in line:
                        continue
                    m = _API_CALL_RE.search(line)
                    if not m:
                        continue  # e.g. in=? out=? (provider returned no usage)
                    prompt, out = int(m["prompt"]), int(m["out"])
                    cr, cw = int(m["cr"] or 0), int(m["cw"] or 0)
                    calls, inp, o, r, w, _ = usage.get(m["sid"], (0, 0, 0, 0, 0, None))
                    usage[m["sid"]] = (calls + 1, inp + max(0, prompt - cr - cw), o + out, r + cr, w + cw, m["model"])
        except OSError:
            continue
    return usage


def _open_merged():
    """Open an in-memory connection merging sessions/messages from every profile DB.

    Self-maintaining: on each call it re-discovers $HERMES_HOME/state.db plus every
    profiles/*/state.db, so new profiles are picked up automatically with no manual
    steps or exported files.

    Dedupe rule per primary key: keep the most recently active copy (sessions by
    last_activity_at/ended_at/started_at, messages by timestamp), ties broken in
    favor of the default profile. Column order can differ between DBs, so every
    column is mapped explicitly rather than relying on positional `SELECT *`.

    Returns (conn, meta) where meta describes which DBs were merged and how many
    rows each contributed to each table after dedupe.
    """
    hermes_home = _hermes_root()
    dbs = _find_db_paths()
    if not dbs:
        raise FileNotFoundError("No state.db found under " + hermes_home)

    def table_columns(db_path, table):
        try:
            src = sqlite3.connect(db_path)
            cols = [c[1] for c in src.execute(f"PRAGMA table_info({table})")]
            src.close()
            return cols or None
        except sqlite3.OperationalError:
            return None

    tables_pk = (("sessions", "id"), ("messages", "id"))
    # Canonical column order = first DB that has the table.
    canonical = {}
    for table, _pk in tables_pk:
        cols = next((table_columns(d, table) for d in dbs if table_columns(d, table)), None)
        if cols:
            canonical[table] = cols

    conn = sqlite3.connect(":memory:")
    meta_dbs = []
    try:
        for i, db_path in enumerate(dbs):
            tag = f"db{i}"
            conn.execute(f"ATTACH DATABASE ? AS {tag}", [db_path])
            label = _db_label(db_path, hermes_home)

            for table, pk in tables_pk:
                src_cols = table_columns(db_path, table)
                if not src_cols or table not in canonical:
                    continue
                cols = canonical[table]
                select_expr = [c if c in src_cols else f"NULL AS {c}" for c in cols]

                # Recency column(s): prefer the most specific activity marker present.
                recency_candidates = (
                    ["last_activity_at", "ended_at", "started_at"]
                    if table == "sessions"
                    else ["timestamp"]
                )
                recency = next((c for c in recency_candidates if c in src_cols), None)
                recency_expr = f"COALESCE({recency}, 0)" if recency else "0"

                if not conn.execute(f"SELECT 1 FROM temp.sqlite_master WHERE name=?", (table,)).fetchone():
                    # First source with this table seeds the merged copy.
                    conn.execute(
                        f"""CREATE TEMP TABLE {table} AS
                            SELECT {", ".join(select_expr)},
                                   CAST({i} AS INTEGER) AS _src,
                                   {recency_expr} AS _recency
                            FROM {tag}.{table}"""
                    )
                else:
                    # Append this source's rows; dedupe runs once after all DBs are merged.
                    conn.execute(
                        f"""INSERT INTO {table} ({", ".join(cols)}, _src, _recency)
                            SELECT {", ".join(select_expr)},
                                   CAST({i} AS INTEGER),
                                   {recency_expr}
                            FROM {tag}.{table}"""
                    )

            # Top up this source's session counters from its own agent.log (never lowers them).
            log_usage = _log_usage(db_path)
            if log_usage and "sessions" in canonical:
                if not conn.execute("SELECT 1 FROM temp.sqlite_master WHERE name='_log_usage'").fetchone():
                    conn.execute("""CREATE TEMP TABLE _log_usage (
                        _src INTEGER, id TEXT, calls INTEGER, input INTEGER, output INTEGER,
                        cache_read INTEGER, cache_write INTEGER, model TEXT)""")
                conn.executemany(
                    "INSERT INTO _log_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [(i, sid, *u) for sid, u in log_usage.items()],
                )
                conn.execute(
                    """CREATE TEMP TABLE IF NOT EXISTS _log_reconciled AS
                       SELECT _src, id FROM _log_usage WHERE 0"""
                )
                conn.execute(
                    """INSERT INTO _log_reconciled
                       SELECT s._src, s.id FROM sessions s JOIN _log_usage l
                         ON l._src = s._src AND l.id = s.id
                       WHERE s._src = ? AND (l.output > COALESCE(s.output_tokens, 0)
                          OR l.input > COALESCE(s.input_tokens, 0)
                          OR l.cache_read > COALESCE(s.cache_read_tokens, 0))""",
                    [i],
                )
                conn.execute(
                    """UPDATE sessions SET
                           input_tokens       = MAX(COALESCE(sessions.input_tokens, 0), l.input),
                           output_tokens      = MAX(COALESCE(sessions.output_tokens, 0), l.output),
                           cache_read_tokens  = MAX(COALESCE(sessions.cache_read_tokens, 0), l.cache_read),
                           cache_write_tokens = MAX(COALESCE(sessions.cache_write_tokens, 0), l.cache_write),
                           api_call_count     = MAX(COALESCE(sessions.api_call_count, 0), l.calls),
                           model              = COALESCE(sessions.model, l.model)
                       FROM _log_usage l
                       WHERE l._src = sessions._src AND l.id = sessions.id AND l._src = ?""",
                    [i],
                )

            meta_dbs.append(label)

        # Sessions: dedupe per id, keeping the most recently active copy, ties broken in
        # favor of the default profile (lowest _src).
        # Messages: ids are per-DB autoincrement integers, so the same id in two DBs is
        # usually a *different* message. Instead of deduping by id, keep each session's
        # messages from whichever DB won that session (orphans are kept as-is).
        for table, pk in tables_pk:
            if table == "sessions":
                conn.execute(
                    f"""CREATE TEMP TABLE {table}_deduped AS
                        SELECT * FROM (
                            SELECT *, ROW_NUMBER() OVER (PARTITION BY {pk} ORDER BY _recency DESC, _src ASC) AS _rn
                            FROM {table}
                        ) WHERE _rn = 1"""
                )
                conn.execute("CREATE TEMP TABLE _session_src AS SELECT id, _src FROM sessions_deduped")
            else:
                conn.execute(
                    f"""CREATE TEMP TABLE {table}_deduped AS
                        SELECT m.* FROM {table} m
                        LEFT JOIN _session_src w ON w.id = m.session_id
                        WHERE w.id IS NULL OR w._src = m._src"""
                )
            conn.execute(f"DROP TABLE {table}")
            # Drop helper columns so the merged table looks like a plain source DB.
            conn.execute(
                f"""CREATE TEMP TABLE {table} AS
                    SELECT {", ".join(canonical[table])} FROM {table}_deduped"""
            )
            conn.execute(f"DROP TABLE {table}_deduped")

        return conn, [{"label": lbl, "path": p} for lbl, p in zip(meta_dbs, dbs)]
    except BaseException:
        conn.close()
        raise


def build_where(filters):
    """Build WHERE clause and params from filters dict."""
    clauses = []
    params = []

    days = filters.get("days", 365 * 10)
    if not isinstance(days, (int, float)) or isinstance(days, bool) or days <= 0:
        raise ValueError(f"Invalid 'days' filter: {days!r} (must be a positive number)")
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
        conn, _ = _open_merged()
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

    conn, _dbs = _open_merged()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Hermes' input_tokens is only the *uncached* part of each prompt; with prompt caching most
    # of the context re-sent on every agent-loop call lands in cache_read_tokens instead. Report
    # input as everything sent (uncached + cache read + cache write) so input/output compare
    # like-for-like, and keep the uncached figure separately.
    cur.execute("ALTER TABLE sessions ADD COLUMN uncached_input_tokens INTEGER")
    cur.execute("""UPDATE sessions SET
        uncached_input_tokens = input_tokens,
        input_tokens = COALESCE(input_tokens, 0) + COALESCE(cache_read_tokens, 0) + COALESCE(cache_write_tokens, 0)
        WHERE input_tokens IS NOT NULL OR cache_read_tokens IS NOT NULL OR cache_write_tokens IS NOT NULL""")

    result = {}

    # --- Overview ---
    cur.execute(f"""
        SELECT
            COUNT(*) as total_sessions,
            COALESCE(SUM(message_count), 0) as total_messages,
            COALESCE(SUM(input_tokens), 0) as total_input_tokens,
            COALESCE(SUM(uncached_input_tokens), 0) as total_uncached_input_tokens,
            COALESCE(SUM(output_tokens), 0) as total_output_tokens,
            COALESCE(SUM(api_call_count), 0) as total_api_calls,
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
    has_reconciled = conn.execute("SELECT 1 FROM temp.sqlite_master WHERE name='_log_reconciled'").fetchone()
    row["log_reconciled_sessions"] = conn.execute(f"""
        SELECT COUNT(*) FROM sessions
        WHERE {where_clause} AND id IN (
            SELECT r.id FROM _log_reconciled r JOIN _session_src w ON w.id = r.id AND w._src = r._src)
    """, where_params).fetchone()[0] if has_reconciled else 0
    result["overview"] = row

    # --- Previous period overview (equal length) ---
    now_ts = int(datetime.now().timestamp())
    period_length = now_ts - cutoff_ts
    prev_cutoff = cutoff_ts - period_length
    prev_params = list(where_params)
    prev_params[0] = prev_cutoff  # started_at >= prev_cutoff
    cur.execute(f"""
        SELECT
            COUNT(*) as sessions,
            COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
            COALESCE(SUM(tool_call_count), 0) as tool_calls,
            COALESCE(SUM(estimated_cost_usd), 0) as estimated_cost
        FROM sessions
        WHERE {where_clause} AND started_at < ?
    """, prev_params + [cutoff_ts])
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

    # --- All models (unfiltered, for the model dropdown) ---
    cur.execute("""
        SELECT DISTINCT model FROM sessions
        WHERE model IS NOT NULL AND model != ''
        ORDER BY model ASC
    """)
    result["models_all"] = [r[0] for r in cur.fetchall()]

    # --- Daily breakdown ---
    cur.execute(f"""
        SELECT
            date(started_at, 'unixepoch', 'localtime') as day,
            COUNT(*) as sessions,
            COALESCE(SUM(input_tokens), 0) as input_tokens,
            COALESCE(SUM(output_tokens), 0) as output_tokens,
            COALESCE(SUM(estimated_cost_usd), 0) as estimated_cost
        FROM sessions
        WHERE {where_clause}
        GROUP BY day
        ORDER BY day ASC
    """, where_params)
    result["daily"] = [dict(r) for r in cur.fetchall()]

    # --- Hourly breakdown (by hour-of-day, aggregated) ---
    cur.execute(f"""
        SELECT
            CAST(strftime('%H', started_at, 'unixepoch', 'localtime') AS INTEGER) as hour,
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
            strftime('%Y-%m-%d %H:00', started_at, 'unixepoch', 'localtime') as hour_ts,
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
            CAST(strftime('%w', started_at, 'unixepoch', 'localtime') AS INTEGER) as dow,
            COUNT(*) as sessions,
            SUM(input_tokens + output_tokens) as total_tokens
        FROM sessions
        WHERE {where_clause}
        GROUP BY dow
        ORDER BY dow ASC
    """, where_params)
    days_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    dow_data = [dict(r) for r in cur.fetchall() if r["dow"] is not None]
    for d in dow_data:
        d["day_name"] = days_names[d["dow"]]
    result["day_of_week"] = dow_data

    # --- Hourly heatmap (24h * day) ---
    cur.execute(f"""
        SELECT
            CAST(strftime('%w', started_at, 'unixepoch', 'localtime') AS INTEGER) as dow,
            CAST(strftime('%H', started_at, 'unixepoch', 'localtime') AS INTEGER) as hour,
            SUM(input_tokens + output_tokens) as total_tokens,
            COUNT(*) as sessions
        FROM sessions
        WHERE {where_clause}
        GROUP BY dow, hour
        ORDER BY dow, hour
    """, where_params)
    heatmap = {}
    for r in cur.fetchall():
        if r[0] is None or r[1] is None:
            continue  # unparseable started_at
        key = f"{r[0]}_{r[1]}"
        heatmap[key] = {"total_tokens": r[2], "sessions": r[3]}
    result["heatmap"] = heatmap

    # --- Weekly breakdown ---
    cur.execute(f"""
        SELECT
            date(started_at, 'unixepoch', 'localtime', 'weekday 0', '-6 days') as week,
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
    cur.execute(f"""
        SELECT m.role, COUNT(*) as count, COALESCE(SUM(m.token_count), 0) as total_tokens
        FROM messages m
        JOIN sessions s ON s.id = m.session_id
        WHERE {where_clause}
        GROUP BY m.role
    """, where_params)
    result["messages_by_role"] = [dict(r) for r in cur.fetchall()]

    # --- Tool usage ---
    cur.execute(f"""
        SELECT m.tool_name, COUNT(*) as calls
        FROM messages m
        JOIN sessions s ON s.id = m.session_id
        WHERE m.tool_name IS NOT NULL AND m.tool_name != '' AND {where_clause}
        GROUP BY m.tool_name
        ORDER BY calls DESC
        LIMIT 20
    """, where_params)
    result["top_tools"] = [dict(r) for r in cur.fetchall()]

    # --- Cost over time ---
    cur.execute(f"""
        SELECT
            date(started_at, 'unixepoch', 'localtime') as day,
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
