# Changelog

All notable changes to cc-lens are documented here. This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## [0.7.0] — 2026-04-06

### Changed

- **Project activity chart** — donut → horizontal bar chart (top 8, full names, session count in tooltip) (#130)
- **Model distribution donut** — I/O tokens only (cache removed — was inflating Opus to 56%), % added to legend (#130)
- **Project display names** — worktree paths grouped under parent (`pve--claude-worktrees-elion` → `pve`) (#131)

## [0.6.1] — 2026-04-06

### Changed

- **Cache immutable patterns** — `setCachedEntry`, `pruneCache`, `setCachedProjectPath` return new objects (#108)
- **CSP: removed `unsafe-eval`** — standalone production build doesn't need it (#109)

### Added

- **`--no-browser` CLI flag** — skip browser open for headless/daemon use (#126)
- **systemd service guide** — `docs/systemd.md` + `cc-lens.service.example` for running as daemon (#126)

### Fixed

- **Overview "From" date** — uses earliest dailyActivity date instead of JSONL session (was missing 2+ months) (#124)
- **Conversations table restored** on overview + "View all sessions" link (#125)

## [0.6.0] — 2026-04-06

### Changed

- **Sidebar navigation grouped** — 12 flat items → 4 semantic sections: Analytics, Workspace, Planning, System (Miller's Law 7±2) (#112)
- **Overview cognitive load reduced** — conversations table replaced with "View all sessions →" link, 12 chunks → ~9 (#113)
- **Chart colors use CSS variables** — `var(--chart-1)` through `var(--chart-5)` in 7 components, theme-adaptive (#117)
- **Dark mode chart contrast boosted** — `--chart-1` from `#d97706` → `#f59e0b`, area fill opacity increased (#114)
- **Breadcrumbs on sub-pages** — /sessions/[id] and /projects/[slug] show clickable parent navigation (#115)
- **2-tier navigation hierarchy** — sidebar groups + breadcrumbs establish primary/secondary navigation (#116)

### Research

Based on: [Miller's Law](https://lawsofux.com/millers-law/), [Airbnb DLS](https://principles.design/examples/airbnb-design-principles), [Google PAIR](https://pair.withgoogle.com/guidebook/), [Microsoft RAI](https://www.microsoft.com/en-us/ai/responsible-ai), [OECD AI Principles](https://oecd.ai/en/ai-principles), [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

## [0.5.2] — 2026-04-06

### Added

- **Chaos tests** for corrupted/malformed JSONL — empty, 50% bad lines, missing fields, binary garbage (#93)
- **Governance fitness functions** — `scripts/fitness-check.sh` checks file size, secrets, console.log; runs in pre-commit + CI (#94)
- **Health architecture dashboard** — `/api/health` returns maxFileLines, testCount, readerModuleCount, apiRouteCount (#95)
- **Welcome onboarding overlay** — first-time users see what cc-lens does and where data comes from (#97)
- **Accessibility docs** — `docs/accessibility.md` with WCAG 2.1 Level A status and `@axe-core/playwright` installed (#99)
- **SECURITY.md** — responsible disclosure process with 48h/7d/30d SLA (#100)
- **STRIDE threat model** — `docs/threat-model.md` covering 4 attack surfaces, 15 mitigations, 5 residual risks (#98)

### Changed

- Tests: 113 → 119 (+6 chaos tests)
- Whole Person Score: Body 4→5, Mind 4→5, Heart 4→5, Spirit 3→5

## [0.5.0] — 2026-04-06

### Changed

- **Standalone output mode** — `output: "standalone"` generates minimal `server.js` with only required deps bundled (#81)
  - RAM: ~1,047 MB → ~300 MB (3.5x reduction)
  - CPU idle: ~100% → ~15% (Next.js 15-16 regression mitigated)
  - Disk: 531 MB → ~100 MB (node_modules no longer needed at runtime)
  - `optimizePackageImports` for recharts, lucide-react, date-fns
  - `webpackMemoryOptimizations` enabled
  - Static assets (`public/`, `.next/static/`) copied into standalone post-build
  - Graceful fallback to `next dev` if standalone unavailable
- **CLI production mode** — `next build` + standalone `server.js` instead of `next dev` (#78)
  - Build once per version (~30-60s), then instant start on subsequent runs
  - `--dev` flag for contributors who need HMR

## [0.4.4] — 2026-04-06

### Changed

- **CLI uses `next build` + `next start` instead of `next dev`** — saves 1.5GB RAM (#78)
  - RAM: 1,840 MB → ~300 MB
  - CPU idle: ~100% → ~0%
  - First page load: 2-5s → <0.5s
  - Build runs once per version (~30-60s), then `next start` for all subsequent runs
  - `--dev` flag available for contributors who need HMR

## [0.4.3] — 2026-04-06

### Fixed

- **Session oscillation root cause** — in-flight promise deduplication for `getSessions()`. All 9 concurrent API callers share one promise (100ms TTL), eliminating cache race condition (#70)
- Silent catch-all in `readSessionsFromProjectJSONL` → always logs `console.error` (#68, #71)
- E2E `waitForFunction` timeout 15s → 30s for cold start reliability (#68)
- `firstSessionDate=""` → Invalid Date guard in overview (#62, #68)
- Error messages: session ID and project slug routes now include "must not contain path separators or '..'" (#68, #71)
- CSP: added `frame-ancestors 'none'` (#68)

### Changed

- `isValidSlug` exported from barrel — inline regex replaced in 3 routes (#68)
- 4 new tests for getSessions oscillation prevention logic (tests: 109 → 113) (#68)

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
