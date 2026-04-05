import { estimateTotalCostFromModel, getPricing } from "@/lib/pricing";
import type { DailyActivity, ModelUsage, SessionMeta } from "@/types/claude";

/** Compute daily activity from session JSONL — fresher than stats-cache */
export function computeDailyActivityFromSessions(
  sessions: SessionMeta[],
): DailyActivity[] {
  const byDate = new Map<
    string,
    { messages: number; sessions: number; tools: number }
  >();
  for (const s of sessions) {
    const date = s.start_time.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const existing = byDate.get(date) ?? { messages: 0, sessions: 0, tools: 0 };
    existing.messages +=
      (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0);
    existing.sessions += 1;
    existing.tools += Object.values(s.tool_counts ?? {}).reduce(
      (a, b) => a + b,
      0,
    );
    byDate.set(date, existing);
  }
  return Array.from(byDate.entries())
    .map(([date, { messages, sessions: count, tools }]) => ({
      date,
      messageCount: messages,
      sessionCount: count,
      toolCallCount: tools,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Merge stats dailyActivity with session-derived data; session data overrides for same dates */
export function mergeDailyActivity(
  fromStats: DailyActivity[],
  fromSessions: DailyActivity[],
): DailyActivity[] {
  const map = new Map<string, DailyActivity>();
  for (const d of fromStats) map.set(d.date, d);
  for (const d of fromSessions) map.set(d.date, d);
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Compute cost and token totals from modelUsage */
export function computeModelTotals(modelUsage: Record<string, ModelUsage>) {
  let totalCost = 0;
  let totalCacheSavings = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;

  for (const [model, usage] of Object.entries(modelUsage)) {
    totalCost += estimateTotalCostFromModel(model, usage);
    const p = getPricing(model);
    totalCacheSavings +=
      (usage.cacheReadInputTokens ?? 0) * (p.input - p.cacheRead);
    totalInputTokens += usage.inputTokens ?? 0;
    totalOutputTokens += usage.outputTokens ?? 0;
    totalCacheReadTokens += usage.cacheReadInputTokens ?? 0;
    totalCacheWriteTokens += usage.cacheCreationInputTokens ?? 0;
  }

  return {
    totalCost,
    totalCacheSavings,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheWriteTokens,
  };
}

/** Aggregate tool call count across all sessions */
export function computeTotalToolCalls(sessions: SessionMeta[]): number {
  let total = 0;
  for (const s of sessions) {
    for (const count of Object.values(s.tool_counts ?? {})) {
      total += count;
    }
  }
  return total;
}

/** Compute session period stats (this month, this week) */
export function computeSessionPeriods(sessions: SessionMeta[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  return {
    sessionsThisMonth: sessions.filter(
      (s) => new Date(s.start_time) >= monthStart,
    ).length,
    sessionsThisWeek: sessions.filter(
      (s) => new Date(s.start_time) >= weekStart,
    ).length,
  };
}
