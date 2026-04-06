# Domain Model — cc-lens

## Core Entities

### SessionMeta

The primary domain object. Derived by parsing one `.jsonl` file from `~/.claude/projects/<slug>/`.

| Field                         | Type       | Source                                            | Invariant                                            |
| ----------------------------- | ---------- | ------------------------------------------------- | ---------------------------------------------------- |
| `session_id`                  | string     | JSONL filename (without .jsonl)                   | Unique across all projects after dedup               |
| `model`                       | string     | Most-used model from assistant messages           | Never empty — falls back to `claude-opus-4-6`        |
| `input_tokens`                | number     | Sum of `usage.input_tokens` from assistant lines  | Does NOT include cache_read (separate field)         |
| `output_tokens`               | number     | Sum of `usage.output_tokens` from assistant lines | —                                                    |
| `cache_read_input_tokens`     | number     | Sum of `usage.cache_read_input_tokens`            | Tokens served from prompt cache (cheaper than input) |
| `cache_creation_input_tokens` | number     | Sum of `usage.cache_creation_input_tokens`        | Tokens written to prompt cache                       |
| `start_time`                  | ISO string | First `timestamp` in JSONL                        | UTC                                                  |
| `duration_minutes`            | number     | (last_timestamp - first_timestamp) / 60000        | Can be 0 for single-message sessions                 |

**Key invariant**: `input_tokens + output_tokens` = unique tokens processed. Cache tokens are separate and overlap with input context.

### Cost Calculation

```
cost = input_tokens × model.input_price
     + output_tokens × model.output_price
     + cache_creation_input_tokens × model.cacheWrite_price
     + cache_read_input_tokens × model.cacheRead_price
```

**Invariants**:

- All 4 token types are always included (never partial)
- Model pricing comes from `lib/pricing.ts` PRICING table
- Unknown models fall back to opus-4-6 pricing (with console.warn)
- `totalTokens` in hero stat = `input + output` only (cache shown separately)

### DailyCost / HourlyCost

Aggregated cost buckets used by the costs page chart.

| Field           | Invariant                                                              |
| --------------- | ---------------------------------------------------------------------- |
| `date` / `hour` | UTC date string (YYYY-MM-DD) or label (MM-DD HH:00)                    |
| `costs`         | `Record<model, cost>` — per-model breakdown within the bucket          |
| `total`         | Sum of all model costs — must equal `Object.values(costs).reduce(sum)` |

**Key invariant**: Date keys are UTC (from `ts.slice(0, 10)` on ISO timestamps). Client filtering must also use UTC cutoffs.

### StatsCache

Pre-computed by Claude Code, stored at `~/.claude/stats-cache.json`. Read-only for cc-lens.

| Field           | Usage                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `modelUsage`    | Authoritative all-time token totals per model — used for per-model table and cache efficiency panel |
| `dailyActivity` | Historical daily message/session counts — merged with fresh JSONL data                              |

**Key invariant**: `modelUsage` may include models/sessions no longer present as JSONL files. It is NOT the source of truth for time-windowed costs — JSONL sessions are.

## Data Source Priority

| Data                                | Source                                                             | When   |
| ----------------------------------- | ------------------------------------------------------------------ | ------ |
| Time-windowed costs (1d/7d/30d/90d) | JSONL sessions via `filterDailyByWindow()`                         | Always |
| All-time cost hero                  | JSONL daily sum (falls back to stats-cache if daily is empty)      | Always |
| Per-model breakdown table           | `stats-cache.json` modelUsage                                      | Always |
| Cache efficiency panel              | `stats-cache.json` modelUsage (labeled "all time")                 | Always |
| Daily activity chart                | Merged: stats-cache + fresh JSONL (JSONL overrides for same dates) | Always |

## Deduplication Rules

- Sessions deduplicated by `session_id` across all project directories
- When duplicate found: keep the one with the latest `start_time`
- Agent sessions (`agent-*`) commonly appear in multiple projects

## Pricing Table (as of v0.4.0)

| Model                    | Input $/M | Output $/M | Cache Write $/M | Cache Read $/M |
| ------------------------ | --------- | ---------- | --------------- | -------------- |
| claude-opus-4-6          | $5.00     | $25.00     | $6.25           | $0.50          |
| claude-opus-4-5-20251101 | $5.00     | $25.00     | $6.25           | $0.50          |
| claude-sonnet-4-6        | $3.00     | $15.00     | $3.75           | $0.30          |
| claude-haiku-4-5         | $1.00     | $5.00      | $1.25           | $0.10          |

Fuzzy matching: model strings with date suffixes (e.g., `claude-haiku-4-5-20251001`) match their prefix.

## Security

- **Security model**: TCP bind `127.0.0.1` (primary) + middleware 2-layer check (defense-in-depth)
- **Input validation**: `isValidSlug()` on all slug/ID parameters, `path.resolve()` boundary check on memory writes
- **Threat model**: [docs/threat-model.md](docs/threat-model.md) — STRIDE analysis covering 4 attack surfaces
- **Disclosure**: [SECURITY.md](SECURITY.md) — responsible reporting process
