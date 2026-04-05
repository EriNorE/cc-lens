# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next.js dev server (port 3000)
npm run build          # Production build
npm run lint           # ESLint (flat config, next/core-web-vitals + TypeScript)
npm test               # Vitest run once
npm run test:watch     # Vitest watch mode
npm run test:ci        # Vitest verbose (used in CI)
npm run verify-data    # Data accuracy smoke test (requires running server on :33033)
npx tsc --noEmit       # Type check (also runs in pre-commit hook via lint-staged)
node bin/cli.js        # Start via CLI (syncs to ~/.cc-lens/, port 33033, opens browser)
node scripts/e2e-test.mjs  # Playwright E2E tests (requires running server)
```

To run a single test file: `npx vitest run __tests__/pricing.test.ts`

## Architecture

cc-lens reads Claude Code session data from `~/.claude/` and serves a Next.js dashboard on localhost.

### Data Flow

```
~/.claude/projects/<slug>/*.jsonl   (raw session JSONL — primary source)
~/.claude/stats-cache.json          (pre-computed aggregates — secondary)
        ↓
lib/readers/sessions.ts             (parse JSONL → SessionMeta)
lib/cache.ts                        (mtime-based cache in ~/.cc-lens/cache/)
        ↓
lib/stats-compute.ts                (aggregate: daily activity, model totals)
lib/costs-compute.ts                (window filtering: 1d/7d/30d/90d/All)
lib/pricing.ts                      (model-specific cost estimation)
        ↓
app/api/*/route.ts                  (thin HTTP handlers, force-dynamic)
        ↓
app/*/page.tsx + components/        (SWR fetch, Recharts visualization)
```

### Readers Barrel Pattern

`lib/claude-reader.ts` is a 3-line re-export from `lib/readers/index.ts`. All imports use `@/lib/claude-reader` for backwards compatibility. The actual implementation is split across 8 modules in `lib/readers/`:

- `sessions.ts` — JSONL parsing, deduplication, cache integration
- `projects.ts` — slug listing, file discovery, path resolution
- `content.ts` — plans, todos, history, skills, plugins, settings
- `memory.ts` — memory files with frontmatter parsing
- `facets.ts`, `stats.ts`, `storage.ts`, `paths.ts`

See `docs/adr/001-split-claude-reader.md` for rationale.

### Dual Cost Sources

- **stats-cache.json** — authoritative for all-time model breakdowns (per-model table, cache efficiency panel)
- **JSONL sessions** — used for time-windowed charts (daily/hourly costs, hero stat)
- Both use the same pricing formula (all 4 token types: input, output, cache_write, cache_read)
- `filterDailyByWindow()` in `lib/costs-compute.ts` is the single source of truth for date cutoffs

### CLI Entry Point (`bin/cli.js`)

Not a thin wrapper — handles source sync to `~/.cc-lens/`, npm install, port finding, browser open. Runs Next.js entirely within `~/.cc-lens/` (no symlinks, avoids Turbopack root issues on Windows). Version file `.cc-lens-version` controls when source re-sync happens.

### Security Model

Localhost-only by design. `middleware.ts` rejects non-localhost requests on `/api/*` with 403. No auth layer — physical network isolation is the security boundary. `CC_LENS_HOST` env var can override but triggers a warning.

## Key Design Decisions

- **mtime cache** (`lib/cache.ts`): Stores parsed SessionMeta keyed by file path + modification time. Provides 65x speedup (22s → 0.34s) on unchanged files.
- **Model tracking**: Each session extracts `model` from JSONL assistant messages (most-used model wins). All cost calculations use the actual model, never hardcoded.
- **Session deduplication**: Agent sessions can appear in multiple project directories. Dedup by session_id, keeping latest start_time.
- **Cost includes cache tokens**: cache_read ($1.50/M for Opus) is a real Anthropic charge. Hero subtitle on "All" window shows cache breakdown for transparency.
- **Computation extraction**: `stats-compute.ts` and `costs-compute.ts` are pure functions — no side effects, independently testable, decoupled from API routes.

## Environment Variables

| Variable                 | Default           | Purpose                             |
| ------------------------ | ----------------- | ----------------------------------- |
| `CC_LENS_PORT`           | `33033`           | Server port                         |
| `CC_LENS_HOST`           | `127.0.0.1`       | Bind address                        |
| `CC_LENS_FALLBACK_MODEL` | `claude-opus-4-6` | Pricing fallback for unknown models |

## Release Checklist

```bash
# 1. Verify everything passes
npx tsc --noEmit && npm test && npx vitest run --coverage

# 2. Bump version (updates package.json only — health endpoint reads it dynamically)
npm version patch   # or minor/major

# 3. Update CHANGELOG.md with new version section

# 4. Commit, tag, push
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release v$(node -p 'require(\"./package.json\").version')"
git tag "v$(node -p 'require("./package.json").version')"
git push && git push --tags

# 5. Create GitHub release
gh release create "v$(node -p 'require("./package.json").version')" --generate-notes
```

## Testing

- **Unit tests**: `__tests__/*.test.ts` — pricing formulas, decode utilities, JSONL parsing
- **Fixtures**: `__tests__/fixtures/sample-session.jsonl`
- **Data smoke test**: `scripts/verify-data.mjs` — 10 checks against raw JSONL (token counts, model tracking, deduplication, cost consistency)
- **E2E tests**: `scripts/e2e-test.mjs` — Playwright headless, 14 checks across all pages + API endpoints
- **Pre-commit**: Husky + lint-staged runs `tsc --noEmit` on staged `.ts/.tsx` files
- **CI**: GitHub Actions runs lint → tsc → vitest → build on push/PR
