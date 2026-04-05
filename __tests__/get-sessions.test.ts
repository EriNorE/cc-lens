import { describe, it, expect } from "vitest";
import type { SessionMeta } from "@/types/claude";

/**
 * Test the getSessions selection logic directly — the "return larger set"
 * oscillation prevention from #62. We test the logic, not the IO functions.
 */

function mockSession(id: string): SessionMeta {
  return {
    session_id: id,
    project_path: "/test",
    start_time: "2026-04-01T10:00:00Z",
    duration_minutes: 30,
    model: "claude-sonnet-4-6",
    user_message_count: 5,
    assistant_message_count: 5,
    tool_counts: {},
    languages: {},
    git_commits: 0,
    git_pushes: 0,
    input_tokens: 1000,
    output_tokens: 500,
    first_prompt: "test",
    user_interruptions: 0,
    user_response_times: [],
    tool_errors: 0,
    tool_error_categories: {},
    uses_task_agent: false,
    uses_mcp: false,
    uses_web_search: false,
    uses_web_fetch: false,
    lines_added: 0,
    lines_removed: 0,
    files_modified: 0,
    message_hours: [],
    user_message_timestamps: [],
  };
}

// Replicate the getSessions selection logic
function selectSessions(
  jsonl: SessionMeta[],
  meta: SessionMeta[],
): SessionMeta[] {
  return jsonl.length >= meta.length ? jsonl : meta;
}

describe("getSessions — oscillation prevention logic", () => {
  it("returns JSONL when JSONL has more sessions", () => {
    const jsonl = [mockSession("s1"), mockSession("s2")];
    const meta = [mockSession("s1")];
    expect(selectSessions(jsonl, meta)).toBe(jsonl);
  });

  it("returns meta when JSONL fails (returns empty)", () => {
    const jsonl: SessionMeta[] = [];
    const meta = [mockSession("s1"), mockSession("s2"), mockSession("s3")];
    expect(selectSessions(jsonl, meta)).toBe(meta);
    expect(selectSessions(jsonl, meta)).toHaveLength(3);
  });

  it("returns empty when both sources return empty", () => {
    expect(selectSessions([], [])).toEqual([]);
  });

  it("prefers JSONL when both have equal length", () => {
    const jsonl = [mockSession("jsonl-1")];
    const meta = [mockSession("meta-1")];
    const result = selectSessions(jsonl, meta);
    expect(result).toBe(jsonl);
    expect(result[0].session_id).toBe("jsonl-1");
  });
});
