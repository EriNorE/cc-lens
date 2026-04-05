import { describe, it, expect } from "vitest";
import {
  computeDailyActivityFromSessions,
  mergeDailyActivity,
  computeModelTotals,
  computeTotalToolCalls,
  computeSessionPeriods,
} from "@/lib/stats-compute";
import type { DailyActivity, ModelUsage, SessionMeta } from "@/types/claude";

function sessionMeta(overrides: Partial<SessionMeta> = {}): SessionMeta {
  return {
    session_id: "test-session",
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
    ...overrides,
  };
}

describe("computeDailyActivityFromSessions", () => {
  it("aggregates sessions by date", () => {
    const sessions = [
      sessionMeta({
        session_id: "s1",
        start_time: "2026-04-01T10:00:00Z",
        user_message_count: 3,
        assistant_message_count: 2,
        tool_counts: { Read: 5, Write: 3 },
      }),
      sessionMeta({
        session_id: "s2",
        start_time: "2026-04-01T14:00:00Z",
        user_message_count: 1,
        assistant_message_count: 1,
        tool_counts: { Bash: 2 },
      }),
    ];
    const result = computeDailyActivityFromSessions(sessions);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: "2026-04-01",
      messageCount: 7, // 3+2+1+1
      sessionCount: 2,
      toolCallCount: 10, // 5+3+2
    });
  });

  it("sorts by date ascending", () => {
    const sessions = [
      sessionMeta({ session_id: "s1", start_time: "2026-04-03T10:00:00Z" }),
      sessionMeta({ session_id: "s2", start_time: "2026-04-01T10:00:00Z" }),
    ];
    const result = computeDailyActivityFromSessions(sessions);
    expect(result[0].date).toBe("2026-04-01");
    expect(result[1].date).toBe("2026-04-03");
  });

  it("skips sessions with invalid date format", () => {
    const sessions = [sessionMeta({ session_id: "s1", start_time: "invalid" })];
    expect(computeDailyActivityFromSessions(sessions)).toHaveLength(0);
  });

  it("returns empty array for no sessions", () => {
    expect(computeDailyActivityFromSessions([])).toEqual([]);
  });
});

describe("mergeDailyActivity", () => {
  it("session data overrides stats for same date", () => {
    const fromStats: DailyActivity[] = [
      {
        date: "2026-04-01",
        messageCount: 10,
        sessionCount: 2,
        toolCallCount: 5,
      },
    ];
    const fromSessions: DailyActivity[] = [
      {
        date: "2026-04-01",
        messageCount: 15,
        sessionCount: 3,
        toolCallCount: 8,
      },
    ];
    const result = mergeDailyActivity(fromStats, fromSessions);
    expect(result).toHaveLength(1);
    expect(result[0].messageCount).toBe(15);
  });

  it("merges entries from different dates", () => {
    const fromStats: DailyActivity[] = [
      {
        date: "2026-04-01",
        messageCount: 10,
        sessionCount: 2,
        toolCallCount: 5,
      },
    ];
    const fromSessions: DailyActivity[] = [
      {
        date: "2026-04-02",
        messageCount: 5,
        sessionCount: 1,
        toolCallCount: 3,
      },
    ];
    const result = mergeDailyActivity(fromStats, fromSessions);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-04-01");
    expect(result[1].date).toBe("2026-04-02");
  });

  it("handles both empty arrays", () => {
    expect(mergeDailyActivity([], [])).toEqual([]);
  });
});

describe("computeModelTotals", () => {
  it("computes cost and token totals across models", () => {
    const usage: Record<string, ModelUsage> = {
      "claude-sonnet-4-6": {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadInputTokens: 200,
        cacheCreationInputTokens: 100,
        costUSD: 0,
        webSearchRequests: 0,
      },
    };
    const result = computeModelTotals(usage);
    expect(result.totalInputTokens).toBe(1000);
    expect(result.totalOutputTokens).toBe(500);
    expect(result.totalCacheReadTokens).toBe(200);
    expect(result.totalCacheWriteTokens).toBe(100);
    expect(result.totalTokens).toBe(1500);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.totalCacheSavings).toBeGreaterThanOrEqual(0);
  });

  it("returns zeros for empty usage", () => {
    const result = computeModelTotals({});
    expect(result.totalCost).toBe(0);
    expect(result.totalTokens).toBe(0);
  });
});

describe("computeTotalToolCalls", () => {
  it("sums tool calls across sessions", () => {
    const sessions = [
      sessionMeta({ tool_counts: { Read: 5, Write: 3 } }),
      sessionMeta({ tool_counts: { Bash: 10 } }),
    ];
    expect(computeTotalToolCalls(sessions)).toBe(18);
  });

  it("returns 0 for no sessions", () => {
    expect(computeTotalToolCalls([])).toBe(0);
  });

  it("handles sessions with empty tool_counts", () => {
    const sessions = [sessionMeta({ tool_counts: {} })];
    expect(computeTotalToolCalls(sessions)).toBe(0);
  });
});

describe("computeSessionPeriods", () => {
  it("counts sessions this month and this week", () => {
    const now = new Date();
    const today = now.toISOString();
    const sessions = [
      sessionMeta({ start_time: today }),
      sessionMeta({ start_time: "2020-01-01T00:00:00Z" }),
    ];
    const result = computeSessionPeriods(sessions);
    expect(result.sessionsThisMonth).toBe(1);
    expect(result.sessionsThisWeek).toBe(1);
  });

  it("returns zeros for no sessions", () => {
    const result = computeSessionPeriods([]);
    expect(result.sessionsThisMonth).toBe(0);
    expect(result.sessionsThisWeek).toBe(0);
  });
});
