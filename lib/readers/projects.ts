import fs from "fs/promises";
import path from "path";
import { claudePath } from "./paths";
import { slugToPath } from "@/lib/decode";

export async function listProjectSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(claudePath("projects"), {
      withFileTypes: true,
    });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return []; // Expected: projects dir may not exist
  }
}

export async function listProjectJSONLFiles(slug: string): Promise<string[]> {
  try {
    const dir = claudePath("projects", slug);
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => path.join(dir, f));
  } catch {
    return []; // Expected: project dir may not exist
  }
}

/** Read JSONL file line by line, calling cb for each parsed line */
export async function readJSONLLines(
  filePath: string,
  cb: (line: Record<string, unknown>) => void,
): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        cb(JSON.parse(line));
      } catch {
        // Expected: skip malformed JSONL lines
      }
    }
  } catch {
    // Expected: file may not exist
  }
}

/** Resolve the actual filesystem path for a project slug */
export async function resolveProjectPath(slug: string): Promise<string> {
  const dir = claudePath("projects", slug);
  try {
    const files = await fs.readdir(dir);
    const jsonl = files.find((f) => f.endsWith(".jsonl"));
    if (!jsonl) return slugToPath(slug);
    const raw = await fs.readFile(path.join(dir, jsonl), "utf-8");
    const firstLine = raw.split(/\r?\n/).find(Boolean);
    if (firstLine) {
      const obj = JSON.parse(firstLine) as { cwd?: string };
      if (obj.cwd) return obj.cwd;
    }
  } catch {
    // Fall through to slug-based path
  }
  return slugToPath(slug);
}

/** Find which project slug contains a given session ID */
export async function findSessionSlug(
  sessionId: string,
): Promise<string | null> {
  const slugs = await listProjectSlugs();
  for (const slug of slugs) {
    const files = await listProjectJSONLFiles(slug);
    for (const f of files) {
      if (path.basename(f).startsWith(sessionId)) return slug;
    }
  }
  return null;
}

/** Find the JSONL file path for a given session ID */
export async function findSessionJSONL(
  sessionId: string,
): Promise<string | null> {
  const slugs = await listProjectSlugs();
  for (const slug of slugs) {
    const files = await listProjectJSONLFiles(slug);
    for (const f of files) {
      if (path.basename(f, ".jsonl") === sessionId) return f;
    }
  }
  return null;
}
