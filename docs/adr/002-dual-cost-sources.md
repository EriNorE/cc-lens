# ADR-002: Dual Cost Sources — stats-cache vs JSONL sessions

## Status

Accepted

## Context

cc-lens has two independent sources of cost data:

1. **stats-cache.json** (`~/.claude/stats-cache.json`) — pre-computed by Claude Code, updated periodically. Contains `modelUsage` with all-time token aggregates per model.
2. **JSONL sessions** (`~/.claude/projects/<slug>/*.jsonl`) — raw session files, always fresh but require parsing.

The costs page needs to show costs across time windows (1d/7d/30d/90d/All). A single source cannot serve all needs:

- stats-cache has no per-day granularity (can't filter by window)
- JSONL sessions may not cover the full history (old files get deleted)

## Decision

Use **JSONL sessions as the primary source** for time-windowed cost views, with **stats-cache as authoritative fallback** for all-time model breakdowns.

### Data Source Assignment

| Display                   | Source                                            | Rationale                                                   |
| ------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| Hero cost (1d/7d/30d/90d) | JSONL daily/hourly sums                           | Window filtering requires per-session timestamps            |
| Hero cost (All)           | JSONL daily sum, fallback to stats-cache if empty | Consistency with other windows; fallback for fresh installs |
| Cost Over Time chart      | JSONL daily/hourly                                | Must align with hero number                                 |
| Per-Model Token Table     | stats-cache modelUsage                            | Authoritative all-time aggregates                           |
| Cache Efficiency Panel    | stats-cache modelUsage                            | Needs all-time totals for meaningful hit rate               |
| Cost by Project           | JSONL sessions                                    | Per-project granularity not available in stats-cache        |

### Window Filtering

Single utility `filterDailyByWindow()` in `lib/costs-compute.ts` used by both hero and chart. Uses UTC date cutoff (`toISOString().slice(0, 10)`) matching the API route's date key format.

## Consequences

### Positive

- Time-windowed costs are always fresh (no waiting for stats-cache refresh)
- Hero and chart values always match (shared filtering utility)
- Per-model table shows complete history including deleted sessions

### Negative

- **"All" hero may differ from per-model table total** — JSONL sum covers only existing files, stats-cache covers full history. Gap is visible when old JSONL files are deleted.
- **Cache cost breakdown is all-time only** — subtitle "incl. $X cache read + $Y cache write" shown only on All window because per-window cache breakdown requires additional API fields.

### Mitigations

- Cache Efficiency panel labeled "(all time)" to distinguish scope from hero
- Hero subtitle only shown on All window to avoid scope mismatch
- `verify-data.mjs` smoke test checks daily sum > 0 and model tracking

## Related

- ADR-001: Split claude-reader.ts into focused modules
- `lib/costs-compute.ts`: filterDailyByWindow, sumDailyCost, sumHourlyCost
- `lib/stats-compute.ts`: computeModelTotals (stats-cache path)
