import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Mock claudePath to use a temp directory
const TEST_DIR = path.join(os.tmpdir(), "cc-lens-test-" + Date.now());

vi.mock("@/lib/readers/paths", () => ({
  CLAUDE_DIR: TEST_DIR,
  claudePath: (...segments: string[]) => path.join(TEST_DIR, ...segments),
}));

// Import after mock
const {
  listProjectSlugs,
  listProjectJSONLFiles,
  resolveProjectPath,
  findSessionSlug,
  findSessionJSONL,
} = await import("@/lib/readers/projects");

async function mkdirp(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

describe("readers/projects", () => {
  beforeEach(async () => {
    await mkdirp(path.join(TEST_DIR, "projects"));
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("listProjectSlugs", () => {
    it("lists directories in projects/", async () => {
      await mkdirp(path.join(TEST_DIR, "projects", "project-a"));
      await mkdirp(path.join(TEST_DIR, "projects", "project-b"));
      // Create a file (should be filtered out)
      await writeFile(path.join(TEST_DIR, "projects", "not-a-dir.txt"), "");

      const slugs = await listProjectSlugs();
      expect(slugs).toContain("project-a");
      expect(slugs).toContain("project-b");
      expect(slugs).not.toContain("not-a-dir.txt");
    });

    it("returns empty array if projects dir missing", async () => {
      await fs.rm(path.join(TEST_DIR, "projects"), {
        recursive: true,
        force: true,
      });
      const slugs = await listProjectSlugs();
      expect(slugs).toEqual([]);
    });
  });

  describe("listProjectJSONLFiles", () => {
    it("lists .jsonl files for a slug", async () => {
      const projDir = path.join(TEST_DIR, "projects", "my-proj");
      await writeFile(path.join(projDir, "session-1.jsonl"), "{}");
      await writeFile(path.join(projDir, "session-2.jsonl"), "{}");
      await writeFile(path.join(projDir, "notes.txt"), "not jsonl");

      const files = await listProjectJSONLFiles("my-proj");
      expect(files).toHaveLength(2);
      expect(files.every((f) => f.endsWith(".jsonl"))).toBe(true);
    });

    it("returns empty for non-existent slug", async () => {
      const files = await listProjectJSONLFiles("no-such-project");
      expect(files).toEqual([]);
    });
  });

  describe("resolveProjectPath", () => {
    it("extracts cwd from first JSONL line", async () => {
      const projDir = path.join(TEST_DIR, "projects", "test-proj");
      const jsonlContent = JSON.stringify({
        cwd: "/Users/dev/my-project",
      });
      await writeFile(path.join(projDir, "session.jsonl"), jsonlContent);

      const resolved = await resolveProjectPath("test-proj");
      expect(resolved).toBe("/Users/dev/my-project");
    });

    it("returns a string for any slug input", async () => {
      const resolved = await resolveProjectPath("nonexistent-slug");
      expect(typeof resolved).toBe("string");
      expect(resolved.length).toBeGreaterThan(0);
    });

    it("falls back when no JSONL files exist", async () => {
      await mkdirp(path.join(TEST_DIR, "projects", "empty-proj"));
      const resolved = await resolveProjectPath("empty-proj");
      expect(typeof resolved).toBe("string");
    });
  });

  describe("findSessionSlug", () => {
    it("finds slug containing a session file", async () => {
      const projDir = path.join(TEST_DIR, "projects", "found-proj");
      await writeFile(
        path.join(projDir, "abc-123-def.jsonl"),
        '{"type":"test"}',
      );

      const slug = await findSessionSlug("abc-123-def");
      expect(slug).toBe("found-proj");
    });

    it("returns null for unknown session", async () => {
      await mkdirp(path.join(TEST_DIR, "projects", "some-proj"));
      const slug = await findSessionSlug("nonexistent-session");
      expect(slug).toBeNull();
    });
  });

  describe("findSessionJSONL", () => {
    it("finds JSONL file path for session ID", async () => {
      const projDir = path.join(TEST_DIR, "projects", "my-proj");
      await writeFile(path.join(projDir, "sess-001.jsonl"), "{}");

      const filePath = await findSessionJSONL("sess-001");
      expect(filePath).toContain("sess-001.jsonl");
    });

    it("returns null for unknown session", async () => {
      await mkdirp(path.join(TEST_DIR, "projects", "proj"));
      const filePath = await findSessionJSONL("no-such");
      expect(filePath).toBeNull();
    });
  });
});
