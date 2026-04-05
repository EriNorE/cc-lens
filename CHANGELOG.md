# Changelog

All notable changes to cc-lens are documented here. This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## [0.4.2] — 2026-04-06

### Fixed

- Session count oscillation (1979/389) — getSessions() returns larger of JSONL/meta sets (#62)
- Overview "From" date hardcoded to 7 days — now uses earliest session date (#55)
- Cache token percentage showed 38,392% — separate denominators for IO vs cache (#56)
- `firstSessionDate=""` → Invalid Date guard in overview (#62)

### Security

- `resolveProjectPath` validates cwd from JSONL — must be absolute, no `..` (#62)
- Session `[id]` and replay routes reject path traversal (#62)
- Content-Security-Policy header added (#62)
- Project slug path traversal validation — `isValidSlug()` helper (#53)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy (#53)
- `readAllSessionMeta` race condition fixed (#53)
- `console.warn` guarded with NODE_ENV !== production (#53)
- npm audit: 7 vulnerabilities → 0 (#53)

### Added

- 32 new tests: integration tests for readers + error path tests + middleware tests
- Coverage now enforces `lib/readers/projects.ts` (83%) and `memory.ts` (97%)

### Changed

- E2E: `waitForTimeout(3000)` → `waitForFunction` with data-loaded signal (#63)
- `security-paths.test.ts` imports `isValidSlug` from production code (#62)
- Coverage exclude narrowed from blanket `lib/readers/**` to specific untested files (#63)

## [0.4.0] — 2026-04-05

### Added

- Per-window cache breakdown — cache savings shown for all time windows (1d/7d/30d/90d/All)
- Unit tests for `stats-compute.ts` and `costs-compute.ts` (27 new tests, 77 total)
- Coverage threshold enforcement in CI (`@vitest/coverage-v8`)
- Health endpoint reads version from `package.json` (no more hardcoded string)

### Fixed

- CLI ETARGET on fresh install — copy `package-lock.json` to `~/.cc-lens/` (#40)
- `CostWindow` type duplication removed — single canonical source (#41)
- CI no longer runs tests twice — merged into single step (#44)

### Security

- Middleware: two-layer defense (CC_LENS_HOST env check + Host header) (#47)
- Atomic cache writes via tmp + rename to prevent corruption (#47)
- API input validation: parseInt NaN guard, Invalid Date guard (#47)
- Sessions reader: eliminated shared array mutation race condition (#47)

### Changed

- Coverage thresholds restored to 80% on pure compute modules (#46)
- `costs/route.ts` GET() refactored into 3 sub-functions (#48)
- DOMAIN.md pricing table updated to v0.4.0 with all models (#48)

## [0.3.2] — 2026-04-05

### Added

- Cost hero subtitle showing cache read + cache write breakdown (All window only)
- Cache Efficiency panel labeled "(all time)" to distinguish scope from hero
- ADR-002: Dual cost sources design decision documented
- CLAUDE.md, PRD.md, DOMAIN.md, PARITY.md project documentation

### Fixed

- Hero and chart now use same date filtering via `filterDailyByWindow()` (were divergent)
- "All" window uses JSONL daily sum (was using stats-cache, causing cost jump)
- logger.error moved from render to useEffect (was logging every 5s on SWR re-render)
- Renamed `window` state to `costWindow` (was shadowing global)
- Removed emoji from Pricing Reference card title
- Restored eslint-disable for justified AnyLine type aliases (CI was failing)

## [0.3.0] — 2026-04-05

### Added

- **Data accuracy**: Track actual model per session from JSONL — costs now use real model pricing instead of hardcoding Opus
- **Session deduplication**: 625 duplicate JSONL files across projects no longer double-counted
- **Data smoke test**: `npm run verify-data` checks 10 accuracy assertions against raw JSONL
- **Test infrastructure**: Vitest + 50 unit tests for pricing, decode, and claude-reader
- **GitHub Actions CI**: Lint + type-check + test + build on push/PR
- **Pre-commit hooks**: Husky + lint-staged runs tsc on staged files
- **Security**: Localhost-only CORS middleware, path.resolve() in memory PATCH, theme allowlist validation
- **Error boundaries**: app/error.tsx with retry button
- **Health endpoint**: GET /api/health returns status, version, claudeDir
- **Export disclaimer**: Warning that exported data contains prompt text
- **Structured logging**: getPricing warns on unknown model fallback

### Changed

- **Cost formula unified**: All endpoints (daily, hourly, project, session) use same 4-token-type formula with actual model
- **Token counting fixed**: Hero stat shows input+output only (26M), not inflated total with cache (16.9B)
- **claude-reader.ts refactored**: 804-line monolith split into 8 modules under lib/readers/
- **Stats computation extracted**: lib/stats-compute.ts with testable functions
- **Error responses sanitized**: No file paths or stack traces in API error JSON

### Fixed

- Hourly cost chart: rolling 24h window, MM-DD HH:00 labels
- Daily cost gap-fill from JSONL after stats-cache cutoff
- Cost calculation consistency across all time windows

## [0.2.7] — pitimon/cc-lens fork baseline

### Added

- **65x performance**: mtime-based session cache (22s → 0.34s)
- **Localhost-only binding**: 127.0.0.1 default, warns on network exposure
- **Collapsible sidebar** with localStorage persistence and Lucide icons
- **Time windows**: 1d/7d/30d/90d/all selector on cost charts
- **Hourly cost chart** for 1d view from JSONL timestamps
- **Rebranded** to pitimon/cc-lens — CLI, README, screenshots, package.json

### Removed

- Auth layer (token login) — unnecessary for localhost-only tool

## [0.2.7] — Arindam200/cc-lens (upstream)

### Features (original)

- Overview: token usage, project distribution, peak hours, model breakdown
- Projects: card grid with sessions, cost, tools, languages, branches
- Sessions: sortable table with filters, full session replay
- Costs: stacked area chart by model, cost by project, cache efficiency
- Tools: tool ranking, MCP server details, feature adoption
- Activity: GitHub-style heatmap, streaks, peak hours
- History: searchable command history
- Memory: browse and edit memory files
- Todos, Plans, Settings, Export/Import
- CLI: `npx cc-lens` with auto-setup and browser launch

## [0.2.0 - 0.2.3] — Arindam200/cc-lens

- CLI source sync and caching mechanism
- Windows compatibility fixes
- Null guards across all API routes
- Hydration mismatch fixes
- JSONL fallback for session data

## [0.1.0 - 0.1.12] — Arindam200/cc-lens

- Initial dashboard with Next.js + Tailwind
- Session replay, cost estimation, tool analytics
- Memory, settings, skills, plugins pages
- CLI entry point with npx distribution
- Turbopack root configuration
