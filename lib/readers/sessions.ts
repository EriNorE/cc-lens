import fs from "fs/promises";
import path from "path";
import type { SessionMeta } from "@/types/claude";
import { claudePath, stripXmlTags } from "./paths";
import {
  listProjectSlugs,
  listProjectJSONLFiles,
  resolveProjectPath,
} from "./projects";
import {
  readCache,
  writeCache,
  getCachedEntry,
  setCachedEntry,
  pruneCache,
  readProjectPathCache,
  writeProjectPathCache,
  getCachedProjectPath,
  setCachedProjectPath,
} from "@/lib/cache";

// ─── JSONL Session Parser ──────────────────────────────────────────────────

async function processFile(
  filePath: string,
  projectPath: string,
  slug: string,
  cache: Parameters<typeof getCachedEntry>[0],
): Promise<SessionMeta | null> {
  try {
    const stat = await fs.stat(filePath);
    const cached = getCachedEntry(cache, filePath, stat.mtimeMs);
    if (cached) return cached;
    const sessionId = path.basename(filePath, ".jsonl");
    const meta = await deriveSessionMetaFromJSONL(
      filePath,
      sessionId,
      projectPath,
      slug,
    );
    if (meta) setCachedEntry(cache, filePath, stat.mtimeMs, stat.size, meta);
    return meta;
  } catch {
    return null; // Expected: file may be unreadable
  }
}

export async function deriveSessionMetaFromJSONL(
  filePath: string,
  sessionId: string,
  projectPath: string,
  _slug: string,
): Promise<SessionMeta | null> {
  let startTime = "";
  let lastTime = "";
  let userCount = 0;
  let assistantCount = 0;
  const toolCounts: Record<string, number> = {};
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let firstPrompt = "";
  const modelCounts: Record<string, number> = {};
  let hasTaskAgent = false;
  let hasMcp = false;
  let hasWebSearch = false;
  let hasWebFetch = false;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as Record<string, unknown>;
        const ts = obj.timestamp as string;
        if (ts) {
          if (!startTime) startTime = ts;
          lastTime = ts;
        }
        if (obj.type === "user") {
          userCount++;
          const content = (
            obj as { message?: { content?: string | unknown[] } }
          ).message?.content;
          if (typeof content === "string" && !firstPrompt)
            firstPrompt = stripXmlTags(content).slice(0, 500);
          else if (Array.isArray(content)) {
            const text = content.find(
              (c: unknown) =>
                typeof c === "object" &&
                c !== null &&
                (c as { type?: string }).type === "text",
            );
            if (
              text &&
              typeof (text as { text?: string }).text === "string" &&
              !firstPrompt
            ) {
              firstPrompt = stripXmlTags((text as { text: string }).text).slice(
                0,
                500,
              );
            }
          }
        }
        if (obj.type === "assistant") {
          assistantCount++;
          const msg = (
            obj as {
              message?: {
                model?: string;
                usage?: Record<string, number>;
                content?: unknown[];
              };
            }
          ).message;
          if (msg?.model) {
            modelCounts[msg.model] = (modelCounts[msg.model] ?? 0) + 1;
          }
          if (msg?.usage) {
            inputTokens += msg.usage.input_tokens ?? 0;
            outputTokens += msg.usage.output_tokens ?? 0;
            cacheRead += msg.usage.cache_read_input_tokens ?? 0;
            cacheWrite += msg.usage.cache_creation_input_tokens ?? 0;
          }
          const content = msg?.content;
          if (Array.isArray(content)) {
            for (const c of content) {
              const item = c as { type?: string; name?: string };
              if (item.type === "tool_use" && item.name) {
                toolCounts[item.name] = (toolCounts[item.name] ?? 0) + 1;
                if (
                  item.name.startsWith("Task") ||
                  item.name === "TodoWrite" ||
                  item.name === "Agent"
                )
                  hasTaskAgent = true;
                if (item.name.startsWith("mcp__")) hasMcp = true;
                if (item.name === "WebSearch") hasWebSearch = true;
                if (item.name === "WebFetch") hasWebFetch = true;
              }
            }
          }
        }
      } catch {
        // Expected: skip malformed JSONL lines
      }
    }
  } catch {
    return null; // Expected: file unreadable
  }

  if (!startTime) return null;

  const start = new Date(startTime).getTime();
  const end = lastTime ? new Date(lastTime).getTime() : start;
  const durationMinutes = (end - start) / 60_000;

  const model =
    Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "claude-opus-4-6";

  return {
    session_id: sessionId,
    project_path: projectPath,
    start_time: startTime,
    duration_minutes: durationMinutes,
    model,
    user_message_count: userCount,
    assistant_message_count: assistantCount,
    tool_counts: toolCounts,
    languages: {},
    git_commits: 0,
    git_pushes: 0,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: cacheWrite,
    cache_read_input_tokens: cacheRead,
    first_prompt: firstPrompt,
    user_interruptions: 0,
    user_response_times: [],
    tool_errors: 0,
    tool_error_categories: {},
    uses_task_agent: hasTaskAgent,
    uses_mcp: hasMcp,
    uses_web_search: hasWebSearch,
    uses_web_fetch: hasWebFetch,
    lines_added: 0,
    lines_removed: 0,
    files_modified: 0,
    message_hours: [],
    user_message_timestamps: [],
  };
}

// ─── Session Readers ────────────────────────────────────────────────────────

export async function readSessionsFromProjectJSONL(): Promise<SessionMeta[]> {
  const [cache, pathCache] = await Promise.all([
    readCache(),
    readProjectPathCache(),
  ]);
  const validPaths = new Set<string>();

  try {
    const slugs = await listProjectSlugs();

    const projectPaths = await Promise.all(
      slugs.map(async (slug) => {
        const cached = getCachedProjectPath(pathCache, slug);
        if (cached) return cached;
        const resolved = await resolveProjectPath(slug);
        setCachedProjectPath(pathCache, slug, resolved);
        return resolved;
      }),
    );

    const filesBySlug = await Promise.all(
      slugs.map(async (slug, i) => {
        const files = await listProjectJSONLFiles(slug);
        return files.map((filePath) => ({
          filePath,
          projectPath: projectPaths[i],
          slug,
        }));
      }),
    );
    const allFiles = filesBySlug.flat();
    for (const f of allFiles) validPaths.add(f.filePath);

    const BATCH_SIZE = 50;
    const results: SessionMeta[] = [];
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((f) => processFile(f.filePath, f.projectPath, f.slug, cache)),
      );
      for (const meta of batchResults) {
        if (meta) results.push(meta);
      }
    }

    pruneCache(cache, validPaths);
    await Promise.all([writeCache(cache), writeProjectPathCache(pathCache)]);

    // Deduplicate sessions by ID — keep the one with the latest start_time
    const seen = new Map<string, SessionMeta>();
    for (const meta of results) {
      const existing = seen.get(meta.session_id);
      if (!existing || meta.start_time > existing.start_time) {
        seen.set(meta.session_id, meta);
      }
    }
    const deduped = Array.from(seen.values());

    return deduped.sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cc-lens] readSessionsFromProjectJSONL failed:", msg);
    return [];
  }
}

export async function readAllSessionMeta(): Promise<SessionMeta[]> {
  const dir = claudePath("usage-data", "session-meta");
  try {
    const files = await fs.readdir(dir);
    const results = (
      await Promise.all(
        files
          .filter((f) => f.endsWith(".json"))
          .map(async (f) => {
            try {
              const raw = await fs.readFile(path.join(dir, f), "utf-8");
              return JSON.parse(raw) as SessionMeta;
            } catch {
              return null;
            }
          }),
      )
    ).filter((m): m is SessionMeta => m !== null);
    return results.sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );
  } catch {
    return []; // Expected: session-meta dir may not exist
  }
}

export async function readSessionMeta(
  sessionId: string,
): Promise<SessionMeta | null> {
  try {
    const raw = await fs.readFile(
      claudePath("usage-data", "session-meta", `${sessionId}.json`),
      "utf-8",
    );
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null; // Expected: session may not exist
  }
}

/** In-flight promise deduplication — all concurrent callers within 100ms
 *  share the same promise, preventing cache race conditions when multiple
 *  API routes call getSessions() simultaneously on page load. */
let _sessionsPromise: Promise<SessionMeta[]> | null = null;

export function getSessions(): Promise<SessionMeta[]> {
  if (!_sessionsPromise) {
    _sessionsPromise = _getSessionsImpl();
    _sessionsPromise.finally(() => {
      setTimeout(() => {
        _sessionsPromise = null;
      }, 100);
    });
  }
  return _sessionsPromise;
}

async function _getSessionsImpl(): Promise<SessionMeta[]> {
  const [jsonl, meta] = await Promise.all([
    readSessionsFromProjectJSONL(),
    readAllSessionMeta(),
  ]);
  return jsonl.length >= meta.length ? jsonl : meta;
}
