// Barrel re-export — preserves the public API of the original claude-reader.ts
export { claudePath } from "./paths";
export { readStatsCache } from "./stats";
export {
  listProjectSlugs,
  listProjectJSONLFiles,
  readJSONLLines,
  resolveProjectPath,
  findSessionSlug,
  findSessionJSONL,
} from "./projects";
export {
  deriveSessionMetaFromJSONL,
  readSessionsFromProjectJSONL,
  readAllSessionMeta,
  readSessionMeta,
  getSessions,
} from "./sessions";
export { readAllFacets, readFacet } from "./facets";
export {
  readPlans,
  readTodos,
  readHistory,
  readSkills,
  readInstalledPlugins,
  readSettings,
} from "./content";
export { readMemories } from "./memory";
export { getClaudeStorageBytes } from "./storage";

// Re-export types
export type { PlanFile, TodoFile, SkillInfo, PluginInfo } from "./content";
export type { MemoryType, MemoryEntry } from "./memory";
