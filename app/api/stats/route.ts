import { NextResponse } from "next/server";
import {
  readStatsCache,
  getSessions,
  getClaudeStorageBytes,
} from "@/lib/claude-reader";
import {
  computeDailyActivityFromSessions,
  mergeDailyActivity,
  computeModelTotals,
  computeTotalToolCalls,
  computeSessionPeriods,
} from "@/lib/stats-compute";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stats, sessions, storageBytes] = await Promise.all([
    readStatsCache(),
    getSessions(),
    getClaudeStorageBytes(),
  ]);

  const dailyFromSessions = computeDailyActivityFromSessions(sessions);
  const dailyActivity = stats
    ? mergeDailyActivity(stats.dailyActivity ?? [], dailyFromSessions)
    : dailyFromSessions;

  const modelUsage = stats?.modelUsage ?? {};
  const totals = computeModelTotals(modelUsage);
  const toolCalls = computeTotalToolCalls(sessions);
  const periods = computeSessionPeriods(sessions);

  const activeDays = dailyActivity.filter((d) => d.sessionCount > 0).length;
  const avgSessionMinutes =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) /
        sessions.length
      : 0;

  const statsOut = stats
    ? { ...stats, dailyActivity }
    : {
        version: 0,
        lastComputedDate: "",
        dailyActivity,
        tokensByDate: [],
        modelUsage: {},
        totalSessions: sessions.length,
        totalMessages: sessions.reduce(
          (s, m) =>
            s + (m.user_message_count ?? 0) + (m.assistant_message_count ?? 0),
          0,
        ),
        longestSession: {
          sessionId: "",
          duration: 0,
          messageCount: 0,
          timestamp: "",
        },
        firstSessionDate: sessions[sessions.length - 1]?.start_time ?? "",
        hourCounts: {},
        totalSpeculationTimeSavedMs: 0,
      };

  return NextResponse.json({
    stats: statsOut,
    computed: {
      ...totals,
      totalToolCalls: toolCalls,
      activeDays,
      avgSessionMinutes,
      ...periods,
      storageBytes,
      sessionCount: sessions.length,
    },
  });
}
