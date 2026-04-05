# ADR-001: Split claude-reader.ts into focused modules

## Status

Accepted

## Context

`lib/claude-reader.ts` is 804 lines containing 11 distinct domains: sessions, stats-cache, projects, facets, plans, todos, history, skills, plugins, settings, memory, and storage. All 16 API routes import from this single file. The file has 30+ bare `catch {}` blocks that silently swallow errors.

## Decision

Split into `lib/readers/` modules with a barrel re-export to preserve the public API.

### Target modules

| Module                | Lines (approx) | Functions                                                                                                                                                   |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readers/sessions.ts` | ~250           | `readSessionsFromProjectJSONL`, `deriveSessionMetaFromJSONL`, `getSessions`, `readAllSessionMeta`, `readSessionMeta`, `findSessionSlug`, `findSessionJSONL` |
| `readers/projects.ts` | ~60            | `listProjectSlugs`, `listProjectJSONLFiles`, `readJSONLLines`, `resolveProjectPath`                                                                         |
| `readers/stats.ts`    | ~20            | `readStatsCache`                                                                                                                                            |
| `readers/content.ts`  | ~180           | `readPlans`, `readTodos`, `readHistory`, `readSkills`, `readInstalledPlugins`, `readSettings`                                                               |
| `readers/memory.ts`   | ~80            | `readMemories` + types                                                                                                                                      |
| `readers/storage.ts`  | ~40            | `getClaudeStorageBytes`                                                                                                                                     |
| `readers/facets.ts`   | ~40            | `readAllFacets`, `readFacet`                                                                                                                                |
| `readers/cache.ts`    | existing       | `readCache`, `writeCache`, `pruneCache` (already in lib/cache.ts)                                                                                           |
| `readers/index.ts`    | ~30            | Barrel re-export — all public API                                                                                                                           |

### Shared utilities

- `claudePath()` → `readers/paths.ts`
- `stripXmlTags()` → `readers/paths.ts`

### Error handling policy

- **ENOENT** (file/dir not found): return empty array/null silently — this is expected for optional data
- **Parse error** (malformed JSON/JSONL): `console.warn` with file path context
- **Unexpected error**: `console.error` with full context, then rethrow or return fallback

### Migration strategy

1. Create `lib/readers/` directory with all modules
2. Replace `lib/claude-reader.ts` with a barrel that re-exports from `lib/readers/`
3. No API route changes needed — imports stay as `@/lib/claude-reader`
4. Add tests for each module before splitting

## Consequences

- Each file stays under 250 lines (vs 804 today)
- Error categorization makes debugging possible
- Cache module already separated — consistent pattern
- All existing imports continue to work via barrel re-export
