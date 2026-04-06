import { NextResponse } from "next/server";
import {
  readStatsCache,
  getSessions,
  readAllFacets,
  readHistory,
} from "@/lib/claude-reader";
import { logger } from "@/lib/logger";
import type { ExportPayload } from "@/types/claude";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { dateRange, excludePrompts } = body as {
      dateRange?: { from?: string; to?: string };
      excludePrompts?: boolean;
    };

    const [stats, sessions, facets, history] = await Promise.all([
      readStatsCache(),
      getSessions(),
      readAllFacets(),
      readHistory(10_000),
    ]);

    // Filter by date range if provided
    const fromRaw = dateRange?.from ? new Date(dateRange.from).getTime() : null;
    const toRaw = dateRange?.to
      ? new Date(dateRange.to + "T23:59:59.999Z").getTime()
      : null;
    const fromMs = fromRaw !== null && !Number.isNaN(fromRaw) ? fromRaw : null;
    const toMs = toRaw !== null && !Number.isNaN(toRaw) ? toRaw : null;
    const filteredSessions = sessions
      .filter((s) => {
        if (!s.start_time) return true;
        const t = new Date(s.start_time).getTime();
        if (fromMs !== null && t < fromMs) return false;
        if (toMs !== null && t > toMs) return false;
        return true;
      })
      .map((s) => (excludePrompts ? { ...s, first_prompt: "[excluded]" } : s));

    const sessionIds = new Set(filteredSessions.map((s) => s.session_id));
    const filteredFacets = facets.filter((f) => sessionIds.has(f.session_id));

    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      stats,
      sessions: filteredSessions,
      facets: filteredFacets,
      history,
    };

    return NextResponse.json(payload);
  } catch (err) {
    logger.error("Failed to export data", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 },
    );
  }
}
