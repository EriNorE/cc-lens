import { describe, it, expect } from "vitest";
import path from "path";
import { deriveSessionMetaFromJSONL } from "@/lib/claude-reader";

const FIXTURE = path.resolve(__dirname, "fixtures/sample-session.jsonl");

describe("deriveSessionMetaFromJSONL", () => {
  it("extracts session metadata from JSONL", async () => {
    const meta = await deriveSessionMetaFromJSONL(
      FIXTURE,
      "test-session",
      "/test/project",
      "test-slug",
    );
    expect(meta).not.toBeNull();
    if (!meta) return;

    expect(meta.session_id).toBe("test-session");
    expect(meta.project_path).toBe("/test/project");
  });

  it("counts user and assistant messages", async () => {
    const meta = await deriveSessionMetaFromJSONL(
      FIXTURE,
      "test-session",
      "/test/project",
      "test-slug",
    );
    expect(meta).not.toBeNull();
    if (!meta) return;

    expect(meta.user_message_count).toBe(2);
    expect(meta.assistant_message_count).toBe(2);
  });

  it("sums token counts from assistant messages", async () => {
    const meta = await deriveSessionMetaFromJSONL(
      FIXTURE,
      "test-session",
      "/test/project",
      "test-slug",
    );
    expect(meta).not.toBeNull();
    if (!meta) return;

    expect(meta.input_tokens).toBe(300); // 100 + 200
    expect(meta.output_tokens).toBe(650); // 250 + 400
    expect(meta.cache_read_input_tokens).toBe(130); // 50 + 80
    expect(meta.cache_creation_input_tokens).toBe(50); // 30 + 20
  });

  it("extracts the most-used model", async () => {
    const meta = await deriveSessionMetaFromJSONL(
      FIXTURE,
      "test-session",
      "/test/project",
      "test-slug",
    );
    expect(meta).not.toBeNull();
    if (!meta) return;

    expect(meta.model).toBe("claude-sonnet-4-6");
  });

  it("counts tool usage", async () => {
    const meta = await deriveSessionMetaFromJSONL(
      FIXTURE,
      "test-session",
      "/test/project",
      "test-slug",
    );
    expect(meta).not.toBeNull();
    if (!meta) return;

    expect(meta.tool_counts["Write"]).toBe(2);
    expect(meta.tool_counts["Bash"]).toBe(1);
  });

  it("extracts first user prompt", async () => {
    const meta = await deriveSessionMetaFromJSONL(
      FIXTURE,
      "test-session",
      "/test/project",
      "test-slug",
    );
    expect(meta).not.toBeNull();
    if (!meta) return;

    expect(meta.first_prompt).toBe("Hello, help me write a function");
  });

  it("computes duration from timestamps", async () => {
    const meta = await deriveSessionMetaFromJSONL(
      FIXTURE,
      "test-session",
      "/test/project",
      "test-slug",
    );
    expect(meta).not.toBeNull();
    if (!meta) return;

    // From 10:00:00 to 10:01:10 = 70 seconds = ~1.17 minutes
    expect(meta.duration_minutes).toBeCloseTo(70 / 60, 1);
  });

  it("returns null for non-existent file", async () => {
    const meta = await deriveSessionMetaFromJSONL(
      "/nonexistent/file.jsonl",
      "x",
      "/x",
      "x",
    );
    expect(meta).toBeNull();
  });
});
