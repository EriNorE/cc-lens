# Contributing to cc-lens

## Development Setup

```bash
git clone https://github.com/pitimon/cc-lens.git
cd cc-lens
npm install
npm run dev
```

Dashboard opens at `http://localhost:3000` (dev) or `http://localhost:33033` (CLI).

## Project Structure

```
lib/
  readers/          # Data layer — reads ~/.claude/ files
    sessions.ts     # JSONL session parsing, dedup, cache
    projects.ts     # Project slug listing, path resolution
    content.ts      # Plans, todos, history, skills, plugins, settings
    memory.ts       # Memory files with frontmatter
    facets.ts       # Session facets
    stats.ts        # stats-cache.json reader
    storage.ts      # Storage size calculation
    paths.ts        # Shared path helpers
    index.ts        # Barrel re-export
  claude-reader.ts  # Re-exports lib/readers/ (backwards compat)
  pricing.ts        # Model pricing and cost estimation
  decode.ts         # Slug/path conversion, formatters
  cache.ts          # mtime-based session cache
  stats-compute.ts  # Computation logic extracted from API routes
app/
  api/              # Next.js API routes (thin handlers)
  overview-client.tsx
  layout.tsx
components/         # React components by feature
types/claude.ts     # All TypeScript interfaces
```

## Coding Conventions

- **TypeScript strict mode** — no `any` except for dynamic JSONL parsing
- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`
- **File size**: < 400 lines per module
- **Error handling**: Silent catch for ENOENT (optional files), warn for parse errors
- **Immutable patterns**: Create new objects, don't mutate

## Running Tests

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:ci       # CI mode (verbose)
npm run verify-data   # Data accuracy smoke test (requires running server)
```

## Pre-commit Hooks

Husky + lint-staged runs `tsc --noEmit` on staged `.ts/.tsx` files. Bypass with `--no-verify` for emergencies.

## Pull Request Checklist

- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` clean
- [ ] Conventional commit message
- [ ] Link to issue being resolved
- [ ] Note any known limitations
