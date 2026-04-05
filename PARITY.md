# Fork Parity — pitimon/cc-lens vs Arindam200/cc-lens

Forked from [Arindam200/cc-lens](https://github.com/Arindam200/cc-lens) at v0.2.7 (commit `862e842`).

## What We Changed

### Performance

| Metric              | Upstream                          | Fork                                       |
| ------------------- | --------------------------------- | ------------------------------------------ |
| /api/stats response | 22s                               | 0.34s (65x)                                |
| Mechanism           | Full JSONL re-parse every request | mtime-based session cache (`lib/cache.ts`) |
| Default port        | 3000                              | 33033                                      |

### Data Accuracy (M0 milestone — 6 issues)

- **Model tracking**: Extract actual model from JSONL assistant messages → `SessionMeta.model`. Upstream hardcoded `claude-opus-4-6` pricing for all sessions (18x overestimate for Haiku).
- **Token counting**: Hero stat shows `input + output` only. Upstream included cache tokens in total (16.9B → 26.1M after fix).
- **Cost formula unified**: All endpoints (daily, hourly, project, session) use same 4-token-type formula with actual model pricing. Upstream had inconsistent formulas.
- **Session deduplication**: 625 duplicate JSONL files across projects no longer double-counted.
- **Cost window filtering**: `lib/costs-compute.ts` — single source of truth. Upstream hero used date cutoff but chart used `slice(-N)`.

### Security (M2 milestone — 5 issues)

- **Localhost-only**: Binds `127.0.0.1` by default (upstream bound `0.0.0.0`)
- **CORS middleware**: Rejects non-localhost requests on `/api/*`
- **Memory PATCH**: Added `path.resolve()` + `..` check for defense-in-depth
- **Error responses**: Sanitized — no file paths or stack traces leaked
- **Theme XSS**: Validates localStorage theme against `['light','dark']` allowlist
- **Export disclaimer**: Warning about prompt text in exports

### Code Quality (M3 milestone — 7 issues)

- **claude-reader.ts**: 804-line monolith → 8 modules under `lib/readers/` with barrel re-export
- **Computation extraction**: `lib/stats-compute.ts` + `lib/costs-compute.ts` — pure functions, testable
- **Error boundaries**: `app/error.tsx` with retry button
- **Health endpoint**: `GET /api/health` → `{ status, version, claudeDir }`
- **Silent catch blocks**: Categorized with comments (ENOENT → silent, parse error → warn)

### Testing & CI (M1 milestone — 6 issues)

- **Vitest**: 50 unit tests (pricing, decode, claude-reader)
- **Data smoke test**: `scripts/verify-data.mjs` — 10 accuracy checks vs raw JSONL
- **E2E tests**: `scripts/e2e-test.mjs` — 14 Playwright checks across all pages
- **GitHub Actions CI**: lint → tsc → vitest → build on push/PR
- **Pre-commit hooks**: Husky + lint-staged (tsc on staged .ts/.tsx)

### Documentation (M4 milestone — 5 issues)

- CLAUDE.md, CONTRIBUTING.md, CHANGELOG.md, docs/api.md (16 endpoints), docs/adr/001
- JSDoc on public pricing functions
- getPricing warns on unknown model fallback

### UI

- Collapsible sidebar with Lucide icons and localStorage persistence
- 1d/7d/30d/90d/All time window selector on cost charts
- Hourly cost chart for 1d view
- Daily cost gap-fill from JSONL after stats-cache cutoff
- Cost hero subtitle: cache read + cache write breakdown (All window)
- Cache Efficiency panel labeled "(all time)"
- Rebranded: GitHub link, CLI banner, package.json → pitimon

### Removed from Upstream

- Auth layer (token login) — unnecessary for localhost-only tool
- `proxy.ts` middleware (replaced with simpler `middleware.ts`)

## What We Kept

- All original dashboard pages (overview, projects, sessions, costs, tools, activity, history, memory, todos, plans, settings, export)
- Session replay with per-turn token display
- CLI distribution model (`bin/cli.js` → `~/.cc-lens/`)
- SWR polling (5s refresh)
- Tailwind + Radix UI + Recharts component stack

## Upstream Sync Status

**Not tracking upstream changes.** This fork diverged significantly in architecture (readers split, computation extraction, cache layer, middleware). Manual cherry-pick of upstream features is possible but requires integration work.
