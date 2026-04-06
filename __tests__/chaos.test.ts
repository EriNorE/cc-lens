import { describe, it, expect, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { deriveSessionMetaFromJSONL } from "@/lib/readers/sessions";

const TMP = path.join(os.tmpdir(), "cc-lens-chaos-" + Date.now());

async function writeFixture(name: string, content: string): Promise<string> {
  const filePath = path.join(TMP, name);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

afterEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

describe("chaos — corrupted JSONL handling", () => {
  it("empty file → returns null, no crash", async () => {
    const f = await writeFixture("empty.jsonl", "");
    const result = await deriveSessionMetaFromJSONL(f, "s1", "/test", "slug");
    expect(result).toBeNull();
  });

  it("50% malformed lines → parses valid lines, skips bad", async () => {
    const content = [
      '{"type":"user","timestamp":"2026-04-01T10:00:00Z","message":{"content":"hello"}}',
      "THIS IS NOT JSON {{{",
      '{"type":"assistant","timestamp":"2026-04-01T10:01:00Z","message":{"model":"claude-sonnet-4-6","usage":{"input_tokens":100,"output_tokens":50}}}',
      "ALSO GARBAGE !!!",
    ].join("\n");
    const f = await writeFixture("half-bad.jsonl", content);
    const result = await deriveSessionMetaFromJSONL(f, "s2", "/test", "slug");
    expect(result).not.toBeNull();
    expect(result!.user_message_count).toBe(1);
    expect(result!.assistant_message_count).toBe(1);
    expect(result!.input_tokens).toBe(100);
    expect(result!.output_tokens).toBe(50);
  });

  it("missing usage field → tokens default to 0", async () => {
    const content = [
      '{"type":"user","timestamp":"2026-04-01T10:00:00Z","message":{"content":"hi"}}',
      '{"type":"assistant","timestamp":"2026-04-01T10:01:00Z","message":{"model":"claude-sonnet-4-6"}}',
    ].join("\n");
    const f = await writeFixture("no-usage.jsonl", content);
    const result = await deriveSessionMetaFromJSONL(f, "s3", "/test", "slug");
    expect(result).not.toBeNull();
    expect(result!.input_tokens).toBe(0);
    expect(result!.output_tokens).toBe(0);
    expect(result!.cache_read_input_tokens).toBe(0);
    expect(result!.cache_creation_input_tokens).toBe(0);
  });

  it("unknown model → falls back to default, no crash", async () => {
    const content = [
      '{"type":"user","timestamp":"2026-04-01T10:00:00Z","message":{"content":"test"}}',
      '{"type":"assistant","timestamp":"2026-04-01T10:01:00Z","message":{"model":"claude-future-99","usage":{"input_tokens":10,"output_tokens":5}}}',
    ].join("\n");
    const f = await writeFixture("unknown-model.jsonl", content);
    const result = await deriveSessionMetaFromJSONL(f, "s4", "/test", "slug");
    expect(result).not.toBeNull();
    expect(result!.model).toBe("claude-future-99");
    expect(result!.input_tokens).toBe(10);
  });

  it("binary garbage .jsonl → returns null gracefully", async () => {
    const garbage = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    const f = path.join(TMP, "garbage.jsonl");
    await fs.mkdir(TMP, { recursive: true });
    await fs.writeFile(f, garbage);
    const result = await deriveSessionMetaFromJSONL(f, "s5", "/test", "slug");
    expect(result).toBeNull();
  });

  it("only timestamps, no type field → returns session with 0 messages", async () => {
    const content = [
      '{"timestamp":"2026-04-01T10:00:00Z","data":"something"}',
      '{"timestamp":"2026-04-01T10:05:00Z","data":"else"}',
    ].join("\n");
    const f = await writeFixture("no-type.jsonl", content);
    const result = await deriveSessionMetaFromJSONL(f, "s6", "/test", "slug");
    expect(result).not.toBeNull();
    expect(result!.user_message_count).toBe(0);
    expect(result!.assistant_message_count).toBe(0);
  });
});
