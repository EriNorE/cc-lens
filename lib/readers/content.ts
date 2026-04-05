import fs from "fs/promises";
import path from "path";
import type { HistoryEntry } from "@/types/claude";
import { claudePath } from "./paths";

// ─── Plans ───────────────────────────────────────────────────────────────────

export interface PlanFile {
  path: string;
  name: string;
  content: string;
  mtime: string;
}

export async function readPlans(): Promise<PlanFile[]> {
  const results: PlanFile[] = [];
  try {
    const dir = claudePath("plans");
    const files = await fs.readdir(dir);
    for (const f of files.filter((x) => x.endsWith(".md"))) {
      try {
        const fullPath = path.join(dir, f);
        const [raw, stat] = await Promise.all([
          fs.readFile(fullPath, "utf-8"),
          fs.stat(fullPath),
        ]);
        results.push({
          path: fullPath,
          name: f.replace(/\.md$/, ""),
          content: raw,
          mtime: stat.mtime.toISOString(),
        });
      } catch {
        // Expected: skip unreadable plan file
      }
    }
    return results.sort((a, b) => b.mtime.localeCompare(a.mtime));
  } catch {
    return []; // Expected: plans dir may not exist
  }
}

// ─── Todos ───────────────────────────────────────────────────────────────────

export interface TodoFile {
  path: string;
  name: string;
  data: unknown;
  mtime: string;
}

export async function readTodos(): Promise<TodoFile[]> {
  const results: TodoFile[] = [];
  try {
    const dir = claudePath("todos");
    const files = await fs.readdir(dir);
    for (const f of files.filter((x) => x.endsWith(".json"))) {
      try {
        const fullPath = path.join(dir, f);
        const [raw, stat] = await Promise.all([
          fs.readFile(fullPath, "utf-8"),
          fs.stat(fullPath),
        ]);
        results.push({
          path: fullPath,
          name: f.replace(/\.json$/, ""),
          data: JSON.parse(raw),
          mtime: stat.mtime.toISOString(),
        });
      } catch {
        // Expected: skip unreadable todo file
      }
    }
    return results.sort((a, b) => b.mtime.localeCompare(a.mtime));
  } catch {
    return []; // Expected: todos dir may not exist
  }
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function readHistory(limit = 200): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = [];
  try {
    const raw = await fs.readFile(claudePath("history.jsonl"), "utf-8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    for (const line of lines.slice(-limit)) {
      try {
        entries.push(JSON.parse(line) as HistoryEntry);
      } catch {
        // Expected: skip malformed history lines
      }
    }
  } catch {
    // Expected: history.jsonl may not exist
  }
  return entries;
}

// ─── Skills ──────────────────────────────────────────────────────────────────

export interface SkillInfo {
  name: string;
  description: string;
  triggers: string;
  hasSkillMd: boolean;
}

export async function readSkills(): Promise<SkillInfo[]> {
  const skillsDir = claudePath("skills");
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const dirs = entries.filter(
      (e) =>
        e.isDirectory() &&
        !e.name.startsWith(".") &&
        e.name !== "nebius-skills-workspace",
    );
    const results: SkillInfo[] = [];
    for (const dir of dirs) {
      const skillMdPath = path.join(skillsDir, dir.name, "SKILL.md");
      let description = "";
      let triggers = "";
      let hasSkillMd = false;
      try {
        const raw = await fs.readFile(skillMdPath, "utf-8");
        hasSkillMd = true;
        const descMatch = raw.match(/^#\s+(.+)$/m);
        if (descMatch) description = descMatch[1].trim();
        const triggerMatch = raw.match(
          /(?:TRIGGER|trigger)[^\n]*\n([\s\S]*?)(?:\n#{1,3}\s|\n---|\n\*\*DO NOT|$)/m,
        );
        if (triggerMatch)
          triggers = triggerMatch[1].replace(/\s+/g, " ").trim().slice(0, 200);
      } catch {
        // Expected: no SKILL.md
      }
      results.push({ name: dir.name, description, triggers, hasSkillMd });
    }
    return results.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return []; // Expected: skills dir may not exist
  }
}

// ─── Plugins ─────────────────────────────────────────────────────────────────

export interface PluginInfo {
  id: string;
  scope: string;
  version: string;
  installedAt: string;
}

export async function readInstalledPlugins(): Promise<PluginInfo[]> {
  try {
    const raw = await fs.readFile(
      claudePath("plugins", "installed_plugins.json"),
      "utf-8",
    );
    const json = JSON.parse(raw) as {
      plugins: Record<
        string,
        Array<{ scope: string; version: string; installedAt: string }>
      >;
    };
    return Object.entries(json.plugins).flatMap(([id, installs]) =>
      installs.map((inst) => ({
        id,
        scope: inst.scope,
        version: inst.version,
        installedAt: inst.installedAt,
      })),
    );
  } catch {
    return []; // Expected: plugins file may not exist
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function readSettings(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(claudePath("settings.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return {}; // Expected: settings.json may not exist
  }
}
