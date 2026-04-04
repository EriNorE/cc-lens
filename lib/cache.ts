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
  await fs.writeFile(CACHE_FILE, JSON.stringify(data));
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
): void {
  cache.entries[filePath] = { mtimeMs, sizeBytes, meta };
}

export function pruneCache(cache: CacheData, validPaths: Set<string>): void {
  for (const key of Object.keys(cache.entries)) {
    if (!validPaths.has(key)) {
      delete cache.entries[key];
    }
  }
}
