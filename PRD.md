# Product Requirements Document — cc-lens

## What

Local-first analytics dashboard for Claude Code. Visualizes token usage, costs, sessions, and project activity from `~/.claude/` data.

## Why

Claude Code generates rich session telemetry but provides no built-in way to review spending, usage patterns, or session history. cc-lens fills this gap without sending data to any cloud service.

## Who

Individual Claude Code users who want to:

- Track API spend across models and time windows
- Understand which projects and sessions consume the most tokens
- Review session replays with per-turn cost visibility
- Monitor cache efficiency and savings
- Browse plans, todos, memory, and settings in one place

## Scope

### In Scope

- Read-only dashboard for `~/.claude/` data (JSONL sessions, stats-cache, plans, todos, memory, settings)
- Cost estimation using hardcoded Anthropic pricing (all 4 token types)
- Time-windowed views: 1d (hourly), 7d, 30d, 90d, All
- Session replay with tool calls, thinking blocks, token timeline
- Export/import of dashboard data as `.ccboard.json`
- Memory file editing (PATCH endpoint with path traversal protection)
- CLI distribution via `npx` or local `node bin/cli.js`

### Out of Scope

- Real-time Anthropic API integration (no API key required)
- Multi-user / team dashboards
- Cloud deployment or hosted version
- Billing alerts or budget enforcement
- Modification of Claude Code session data (read-only except memory)
- Support for non-Claude AI tools

## Success Criteria

- Page load < 1s on warm cache (achieved: 0.34s)
- Cost accuracy: dashboard values match manual JSONL calculation (verified by `npm run verify-data`)
- Zero telemetry: no outbound network requests
- Works on macOS, Linux, Windows with Node.js 18+

## Non-Functional Requirements

- Localhost-only by default (middleware enforced)
- No authentication — security via network isolation
- SWR polling every 5s for live updates while dashboard is open
- Session deduplication across project directories
