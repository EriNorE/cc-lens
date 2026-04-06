# Threat Model — cc-lens

STRIDE analysis for cc-lens v0.5.0. Last updated: 2026-04-06.

## Assets

| Asset         | Location                                | Sensitivity                               |
| ------------- | --------------------------------------- | ----------------------------------------- |
| Session JSONL | `~/.claude/projects/<slug>/*.jsonl`     | HIGH — contains prompts, code, tool calls |
| Stats cache   | `~/.claude/stats-cache.json`            | MEDIUM — aggregated usage data            |
| Memory files  | `~/.claude/projects/<slug>/memory/*.md` | MEDIUM — user notes and preferences       |
| Settings      | `~/.claude/settings.json`               | LOW — configuration only                  |
| Mtime cache   | `~/.cc-lens/cache/sessions.json`        | LOW — derived data, regenerable           |

## Trust Boundaries

```
+------------------+       +-------------------+       +------------------+
|    Browser       | HTTP  |   Next.js API     |  fs   |   ~/.claude/     |
|  localhost:33033 |------>|   middleware.ts    |------>|   (read-only*)   |
|                  |<------|   route handlers   |<------|                  |
+------------------+       +-------------------+       +------------------+
                            |                   |
                            |  ~/.cc-lens/      |
                            |  cache/ (r/w)     |
                            +-------------------+

* memory PATCH endpoint can write to ~/.claude/projects/<slug>/memory/
```

### Boundary Controls

| Boundary           | Control          | Mechanism                                                                        |
| ------------------ | ---------------- | -------------------------------------------------------------------------------- |
| Network → API      | Localhost only   | TCP bind `127.0.0.1` + middleware 2-layer (CC_LENS_HOST env check + Host header) |
| API → Filesystem   | Path validation  | `isValidSlug()` rejects `../` and `/\` in slugs and session IDs                  |
| API → Memory write | Defense-in-depth | Regex guard + `path.resolve()` boundary check + `.md` extension enforcement      |
| Browser → API      | CSP              | `default-src 'self'; frame-ancestors 'none'` + X-Frame-Options DENY              |

## Data Flow

```
~/.claude/projects/<slug>/*.jsonl
        |
        v
  lib/readers/sessions.ts ──> lib/cache.ts (atomic write: tmp + rename)
  lib/readers/projects.ts       |
  lib/readers/memory.ts         v
        |               ~/.cc-lens/cache/sessions.json
        v
  lib/stats-compute.ts
  lib/costs-compute.ts
  lib/pricing.ts
        |
        v
  app/api/*/route.ts (force-dynamic, no HTTP cache)
        |
        v
  middleware.ts (localhost guard)
        |
        v
  Browser (SWR fetch, Recharts render)
```

## STRIDE Analysis

### 1. Memory PATCH Endpoint (`/api/memory`)

| Threat                       | Category            | Risk   | Mitigation                                                      | Status    |
| ---------------------------- | ------------------- | ------ | --------------------------------------------------------------- | --------- |
| Write arbitrary files        | **Tampering**       | HIGH   | Regex rejects `/\` and `..` in slug and filename                | Mitigated |
| Escape memory directory      | **Tampering**       | HIGH   | `path.resolve()` + boundary check against `~/.claude/projects/` | Mitigated |
| Write non-markdown files     | **Tampering**       | MEDIUM | `.md` extension enforcement                                     | Mitigated |
| Read file contents via error | **Info Disclosure** | LOW    | Generic error "Failed to write memory file" — no path leak      | Mitigated |

### 2. JSONL Parsing (`lib/readers/`)

| Threat                         | Category      | Risk   | Mitigation                                                    | Status    |
| ------------------------------ | ------------- | ------ | ------------------------------------------------------------- | --------- |
| Malicious `cwd` in JSONL       | **Tampering** | HIGH   | `path.isAbsolute()` + no `..` check in `resolveProjectPath()` | Mitigated |
| Malformed JSONL crashes server | **DoS**       | MEDIUM | Try/catch per line, per file. `console.error` logs failures.  | Mitigated |
| Concurrent cache corruption    | **Tampering** | HIGH   | In-flight promise deduplication (100ms TTL) — single writer   | Mitigated |
| Cache file corruption on crash | **Tampering** | MEDIUM | Atomic write via `.tmp` + `fs.rename()`                       | Mitigated |

### 3. Export/Import (`/api/export`, `/api/import`)

| Threat                                 | Category            | Risk   | Mitigation                                                        | Status            |
| -------------------------------------- | ------------------- | ------ | ----------------------------------------------------------------- | ----------------- |
| Exfiltrate session data                | **Info Disclosure** | LOW    | Localhost-only — attacker needs local access                      | Accepted (design) |
| Import malicious data                  | **Spoofing**        | MEDIUM | Import validates JSON structure. No code execution from import.   | Mitigated         |
| Invalid date range → unfiltered export | **Info Disclosure** | LOW    | NaN date guard — falls back to no filter (returns all, not error) | Mitigated         |

### 4. CLI (`bin/cli.js`)

| Threat                           | Category      | Risk   | Mitigation                                                                  | Status    |
| -------------------------------- | ------------- | ------ | --------------------------------------------------------------------------- | --------- |
| Bind to `0.0.0.0` → LAN exposure | **Elevation** | HIGH   | `CC_LENS_HOST` env check in middleware blocks all API on non-localhost bind | Mitigated |
| `npm install` supply chain       | **Tampering** | MEDIUM | `package-lock.json` copied, `--prefer-offline`. npm audit = 0 vulns.        | Mitigated |
| Standalone `server.js` tampered  | **Tampering** | LOW    | Built locally from source. No remote artifact download.                     | Accepted  |

## Residual Risks

| Risk                                     | Severity | Rationale                                                                                                                   |
| ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Host header spoofing on localhost        | LOW      | TCP bind is primary boundary. Header check is defense-in-depth only. Spoofing requires local access.                        |
| `unsafe-inline` + `unsafe-eval` in CSP   | LOW      | Required for Next.js dev mode and Recharts. Localhost-only limits XSS attack surface.                                       |
| Cache mutation pattern                   | LOW      | `setCachedEntry()` mutates directly. Promise dedup prevents concurrent mutation. Full immutability deferred as scope creep. |
| No rate limiting on API                  | LOW      | Localhost-only. No external traffic. Rate limiting adds complexity without benefit.                                         |
| Session data readable by local processes | LOW      | By design — cc-lens is a local tool. `~/.claude/` is already readable by the user.                                          |

## References

- [SECURITY.md](../SECURITY.md) — Responsible disclosure process
- [ADR-001](adr/001-split-claude-reader.md) — Reader module architecture
- [ADR-002](adr/002-dual-cost-sources.md) — Dual cost sources design
- [8-Habit QA Summary](8-HABIT-QA-SUMMARY.md) — 8 rounds, 15 issues, 17/17 final score
