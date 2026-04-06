import fs from "fs/promises";
import path from "path";
import os from "os";
import type { SessionMeta } from "@/types/claude";

const CACHE_DIR = path.join(os.homedir(), ".cc-lens", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "sessions.json");

interface CacheEntry {
  mtimeMs: number;
  sizeBytes: number;
  meta: SessionMeta;
}

interface CacheData {
  version: 1;
  entries: Record<string, CacheEntry>;
}

export async function readCache(): Promise<CacheData> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    const data = JSON.parse(raw) as CacheData;
    if (data.version === 1 && data.entries) return data;
  } catch {
    /* missing or corrupt */
  }
  return { version: 1, entries: {} };
}

export async function writeCache(data: CacheData): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const tmp = CACHE_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data));
  await fs.rename(tmp, CACHE_FILE);
}

export function getCachedEntry(
  cache: CacheData,
  filePath: string,
  mtimeMs: number,
): SessionMeta | null {
  const entry = cache.entries[filePath];
  if (entry && entry.mtimeMs === mtimeMs) return entry.meta;
  return null;
}

export function setCachedEntry(
  cache: CacheData,
  filePath: string,
  mtimeMs: number,
  sizeBytes: number,
  meta: SessionMeta,
): CacheData {
  return {
    ...cache,
    entries: { ...cache.entries, [filePath]: { mtimeMs, sizeBytes, meta } },
  };
}

export function pruneCache(
  cache: CacheData,
  validPaths: Set<string>,
): CacheData {
  const entries: Record<string, CacheEntry> = {};
  for (const [key, value] of Object.entries(cache.entries)) {
    if (validPaths.has(key)) entries[key] = value;
  }
  return { ...cache, entries };
}

// ─── Project Path Cache ─────────────────────────────────────────────────────

const PROJECT_PATH_FILE = path.join(CACHE_DIR, "project-paths.json");

interface ProjectPathCache {
  version: 1;
  paths: Record<string, string>;
}

export async function readProjectPathCache(): Promise<ProjectPathCache> {
  try {
    const raw = await fs.readFile(PROJECT_PATH_FILE, "utf-8");
    const data = JSON.parse(raw) as ProjectPathCache;
    if (data.version === 1 && data.paths) return data;
  } catch {
    /* missing or corrupt */
  }
  return { version: 1, paths: {} };
}

export async function writeProjectPathCache(
  data: ProjectPathCache,
): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const tmp = PROJECT_PATH_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data));
  await fs.rename(tmp, PROJECT_PATH_FILE);
}

export function getCachedProjectPath(
  cache: ProjectPathCache,
  slug: string,
): string | null {
  return cache.paths[slug] ?? null;
}

export function setCachedProjectPath(
  cache: ProjectPathCache,
  slug: string,
  projectPath: string,
): ProjectPathCache {
  return { ...cache, paths: { ...cache.paths, [slug]: projectPath } };
}
