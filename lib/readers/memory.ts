import fs from "fs/promises";
import path from "path";
import { slugToPath } from "@/lib/decode";
import { claudePath } from "./paths";
import { listProjectSlugs } from "./projects";

export type MemoryType =
  | "user"
  | "feedback"
  | "project"
  | "reference"
  | "index"
  | "unknown";

export interface MemoryEntry {
  file: string;
  projectSlug: string;
  projectPath: string;
  name: string;
  type: MemoryType;
  description: string;
  body: string;
  mtime: string;
  isIndex: boolean;
}

function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key) meta[key] = val;
  }
  return { meta, body: match[2].trim() };
}

export async function readMemories(): Promise<MemoryEntry[]> {
  const results: MemoryEntry[] = [];
  try {
    const slugs = await listProjectSlugs();
    await Promise.all(
      slugs.map(async (slug) => {
        const memDir = claudePath("projects", slug, "memory");
        try {
          const files = await fs.readdir(memDir);
          const mdFiles = files.filter((f) => f.endsWith(".md"));
          await Promise.all(
            mdFiles.map(async (file) => {
              try {
                const fullPath = path.join(memDir, file);
                const [raw, stat] = await Promise.all([
                  fs.readFile(fullPath, "utf-8"),
                  fs.stat(fullPath),
                ]);
                const isIndex = file === "MEMORY.md";
                const { meta, body } = parseFrontmatter(raw);
                const projectPath = slugToPath(slug);
                const h1Match = body.match(/^#\s+(.+)$/m);
                const titleFromBody = h1Match ? h1Match[1].trim() : null;
                results.push({
                  file,
                  projectSlug: slug,
                  projectPath,
                  name:
                    meta.name ??
                    titleFromBody ??
                    (isIndex ? "Memory Index" : file.replace(/\.md$/, "")),
                  type:
                    (meta.type as MemoryType) ??
                    (isIndex ? "index" : "unknown"),
                  description: meta.description ?? "",
                  body,
                  mtime: stat.mtime.toISOString(),
                  isIndex,
                });
              } catch {
                // Expected: skip unreadable memory file
              }
            }),
          );
        } catch {
          // Expected: no memory dir for this project
        }
      }),
    );
  } catch {
    // Expected: projects dir may not exist
  }
  return results.sort((a, b) => b.mtime.localeCompare(a.mtime));
}
