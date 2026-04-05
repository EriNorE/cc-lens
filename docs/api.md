# API Reference

All endpoints are under `/api/`. Data auto-refreshes via SWR with 5s polling.

## GET /api/health

Returns server status.

```json
{ "status": "ok", "version": "0.2.7", "claudeDir": true }
```

`status` is `"degraded"` if `~/.claude/` is unreadable.

## GET /api/stats

Returns aggregated stats, token totals, cost, and daily activity.

**Response shape:**

```json
{
  "stats": { "modelUsage": {}, "dailyActivity": [], "totalSessions": 0, ... },
  "computed": {
    "totalCost": 0, "totalCacheSavings": 0,
    "totalTokens": 0, "totalInputTokens": 0, "totalOutputTokens": 0,
    "totalCacheReadTokens": 0, "totalCacheWriteTokens": 0,
    "totalToolCalls": 0, "activeDays": 0, "avgSessionMinutes": 0,
    "sessionsThisMonth": 0, "sessionsThisWeek": 0,
    "storageBytes": 0, "sessionCount": 0
  }
}
```

## GET /api/costs

Returns cost analytics: per-model breakdown, daily/hourly costs, cost by project.

**Response shape:**

```json
{
  "total_cost": 0, "total_savings": 0,
  "models": [{ "model": "", "input_tokens": 0, "output_tokens": 0, "estimated_cost": 0, ... }],
  "daily": [{ "date": "2026-01-01", "costs": { "claude-opus-4-6": 0 }, "total": 0 }],
  "hourly": [{ "hour": "04-05 14:00", "costs": {}, "total": 0 }],
  "by_project": [{ "slug": "", "display_name": "", "estimated_cost": 0, ... }]
}
```

## GET /api/sessions

Returns all sessions with enrichment (slug, version, compaction, thinking flags).

**Response shape:**

```json
{
  "sessions": [{
    "session_id": "", "project_path": "", "start_time": "", "model": "",
    "input_tokens": 0, "output_tokens": 0, "estimated_cost": 0,
    "tool_counts": {}, "first_prompt": "", ...
  }]
}
```

## GET /api/sessions/[id]

Returns a single session by ID with facet data.

**Response:** `{ "session": { ...SessionMeta, "facet": {...}, "estimated_cost": 0 } }`

**404** if session not found.

## GET /api/sessions/[id]/replay

Returns parsed session replay (turns, tool calls, token timeline).

**Response:** `{ "turns": [...], "tokenTimeline": [...] }`

## GET /api/projects

Returns project summaries with session counts, cost, tools, languages.

**Response:** `{ "projects": [{ "slug": "", "display_name": "", "estimated_cost": 0, "session_count": 0, ... }] }`

## GET /api/projects/[slug]

Returns sessions for a specific project.

**Response:** `{ "project": { "slug": "", "display_name": "" }, "sessions": [...] }`

## GET /api/activity

Returns activity analytics: daily activity, streaks, peak hours, day-of-week patterns.

**Response:** `{ "daily": [...], "streaks": {...}, "peakHours": [...], "dayOfWeek": [...], ... }`

## GET /api/tools

Returns tool usage analytics: tool ranking, MCP servers, version history.

**Response:** `{ "tools": [...], "mcpServers": [...], "versions": [...], ... }`

## GET /api/history

Returns command history from `history.jsonl`.

**Query params:**

- `limit` (number, default 200, max 10000)

**Response:** `{ "history": [{ "type": "", "command": "", "timestamp": "", ... }] }`

## GET /api/memory

Returns memory entries across all projects.

**Response:** `{ "memories": [{ "file": "", "projectSlug": "", "name": "", "type": "", "body": "", ... }] }`

## PATCH /api/memory

Writes a memory file. Path traversal protected with `path.resolve()`.

**Request body:**

```json
{ "projectSlug": "...", "file": "filename.md", "content": "..." }
```

**400** if missing fields, non-.md file, or path traversal detected.
**403** if resolved path is outside `~/.claude/projects/`.

## GET /api/plans

Returns plan files from `~/.claude/plans/`.

**Response:** `{ "plans": [{ "name": "", "content": "", "mtime": "" }] }`

## GET /api/todos

Returns todo files from `~/.claude/todos/`.

**Response:** `{ "todos": [{ "name": "", "data": {...}, "mtime": "" }] }`

## GET /api/settings

Returns `~/.claude/settings.json` contents.

**Response:** `{ "settings": {...}, "skills": [...], "plugins": [...] }`

## POST /api/export

Exports dashboard data as JSON.

**Request body:** `{ "dateRange": { "from": "2026-01-01", "to": "2026-12-31" } }` (optional)

**Response:** `{ "stats": {...}, "sessions": [...], "facets": [...], "history": [...] }`

## POST /api/import

Previews an import merge (does not write files).

**Request body:** ExportPayload

**Response:** `{ "preview": { "new": 0, "existing": 0, "total": 0 } }`
