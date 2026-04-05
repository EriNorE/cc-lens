import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEST_DIR = path.join(os.tmpdir(), "cc-lens-mem-test-" + Date.now());

vi.mock("@/lib/readers/paths", () => ({
  CLAUDE_DIR: TEST_DIR,
  claudePath: (...segments: string[]) => path.join(TEST_DIR, ...segments),
}));

const { readMemories } = await import("@/lib/readers/memory");

async function writeFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

describe("readers/memory", () => {
  beforeEach(async () => {
    await fs.mkdir(path.join(TEST_DIR, "projects"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("parses memory files with frontmatter", async () => {
    const memDir = path.join(TEST_DIR, "projects", "test-proj", "memory");
    await writeFile(
      path.join(memDir, "user_role.md"),
      `---
name: User Role
description: The user is a senior engineer
type: user
---

User is a senior backend engineer with 10 years experience.`,
    );

    const memories = await readMemories();
    expect(memories).toHaveLength(1);
    expect(memories[0].name).toBe("User Role");
    expect(memories[0].type).toBe("user");
    expect(memories[0].description).toBe("The user is a senior engineer");
    expect(memories[0].body).toContain("senior backend engineer");
    expect(memories[0].projectSlug).toBe("test-proj");
    expect(memories[0].file).toBe("user_role.md");
    expect(memories[0].isIndex).toBe(false);
  });

  it("identifies MEMORY.md as index", async () => {
    const memDir = path.join(TEST_DIR, "projects", "test-proj", "memory");
    await writeFile(
      path.join(memDir, "MEMORY.md"),
      "- [User Role](user_role.md) — Senior engineer",
    );

    const memories = await readMemories();
    expect(memories).toHaveLength(1);
    expect(memories[0].isIndex).toBe(true);
    expect(memories[0].name).toBe("Memory Index");
    expect(memories[0].type).toBe("index");
  });

  it("handles missing frontmatter gracefully", async () => {
    const memDir = path.join(TEST_DIR, "projects", "test-proj", "memory");
    await writeFile(
      path.join(memDir, "no-frontmatter.md"),
      "# My Note\n\nJust plain markdown without frontmatter.",
    );

    const memories = await readMemories();
    expect(memories).toHaveLength(1);
    expect(memories[0].name).toBe("My Note");
    expect(memories[0].type).toBe("unknown");
    expect(memories[0].description).toBe("");
  });

  it("reads from multiple projects", async () => {
    await writeFile(
      path.join(TEST_DIR, "projects", "proj-a", "memory", "a.md"),
      "---\nname: A\ntype: feedback\n---\nContent A",
    );
    await writeFile(
      path.join(TEST_DIR, "projects", "proj-b", "memory", "b.md"),
      "---\nname: B\ntype: project\n---\nContent B",
    );

    const memories = await readMemories();
    expect(memories).toHaveLength(2);
    const names = memories.map((m) => m.name);
    expect(names).toContain("A");
    expect(names).toContain("B");
  });

  it("returns empty when no projects exist", async () => {
    await fs.rm(path.join(TEST_DIR, "projects"), {
      recursive: true,
      force: true,
    });
    const memories = await readMemories();
    expect(memories).toEqual([]);
  });

  it("skips non-.md files", async () => {
    const memDir = path.join(TEST_DIR, "projects", "test-proj", "memory");
    await writeFile(path.join(memDir, "valid.md"), "---\nname: Valid\n---\nOK");
    await writeFile(path.join(memDir, "ignore.txt"), "not a memory file");

    const memories = await readMemories();
    expect(memories).toHaveLength(1);
    expect(memories[0].file).toBe("valid.md");
  });
});
