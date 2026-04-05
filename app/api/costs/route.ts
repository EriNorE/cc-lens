import { NextResponse } from "next/server";
import { readStatsCache, getSessions } from "@/lib/claude-reader";
import {
  estimateTotalCostFromModel,
  cacheEfficiency,
  getPricing,
} from "@/lib/pricing";
import { projectDisplayName } from "@/lib/decode";
import type {
  CostAnalytics,
  ModelCostBreakdown,
  DailyCost,
  HourlyCost,
  ProjectCost,
} from "@/types/claude";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stats, sessions] = await Promise.all([
    readStatsCache(),
    getSessions(),
  ]);

  if (!stats) {
    return NextResponse.json(
      { error: "stats-cache.json not found" },
      { status: 404 },
    );
  }

  // ── Per-model breakdown (from stats-cache — authoritative totals) ─────────
  let totalCost = 0;
  let totalSavings = 0;
  const models: ModelCostBreakdown[] = Object.entries(stats.modelUsage ?? {})
    .map(([model, usage]) => {
      const cost = estimateTotalCostFromModel(model, usage);
      const eff = cacheEfficiency(model, usage);
      totalCost += cost;
      totalSavings += eff.savedUSD;
      return {
        model,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        cache_write_tokens: usage.cacheCreationInputTokens ?? 0,
        cache_read_tokens: usage.cacheReadInputTokens ?? 0,
        estimated_cost: cost,
        cache_savings: eff.savedUSD ?? 0,
        cache_hit_rate: eff.hitRate ?? 0,
      };
    })
    .sort((a, b) => b.estimated_cost - a.estimated_cost);

  // ── Daily + Hourly cost — ALL from JSONL sessions (single source of truth) ─
  // This ensures 1d/7d/30d/90d/All use the same calculation method
  const dailyMap = new Map<
    string,
    { costs: Record<string, number>; total: number }
  >();
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hourlyMap = new Map<
    string,
    { costs: Record<string, number>; total: number }
  >();

  for (const s of sessions) {
    const ts = s.start_time ?? "";
    if (!ts) continue;
    const date = ts.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    // Use actual session model for pricing (not hardcoded Opus)
    const sessionModel = s.model ?? "claude-opus-4-6";
    const p = getPricing(sessionModel);
    const cost =
      (s.input_tokens ?? 0) * p.input +
      (s.output_tokens ?? 0) * p.output +
      (s.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (s.cache_read_input_tokens ?? 0) * p.cacheRead;

    // Daily aggregation
    const dayEntry = dailyMap.get(date) ?? { costs: {}, total: 0 };
    dayEntry.total += cost;
    dayEntry.costs[sessionModel] = (dayEntry.costs[sessionModel] ?? 0) + cost;
    dailyMap.set(date, dayEntry);

    // Hourly aggregation (last 24h only)
    const sessionTime = new Date(ts);
    if (sessionTime >= cutoff24h) {
      const mm = String(sessionTime.getMonth() + 1).padStart(2, "0");
      const dd = String(sessionTime.getDate()).padStart(2, "0");
      const hh = String(sessionTime.getHours()).padStart(2, "0");
      const hourLabel = `${mm}-${dd} ${hh}:00`;
      const hourEntry = hourlyMap.get(hourLabel) ?? { costs: {}, total: 0 };
      hourEntry.total += cost;
      hourEntry.costs[sessionModel] =
        (hourEntry.costs[sessionModel] ?? 0) + cost;
      hourlyMap.set(hourLabel, hourEntry);
    }
  }

  const daily: DailyCost[] = [...dailyMap.entries()]
    .map(([date, { costs, total }]) => ({ date, costs, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const hourly: HourlyCost[] = [...hourlyMap.entries()]
    .map(([hour, { costs, total }]) => ({ hour, costs, total }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // ── Cost by project ────────────────────────────────────────────────────────
  const projectMap = new Map<
    string,
    { cost: number; input: number; output: number }
  >();
  for (const s of sessions) {
    const slug = s.project_path ?? "";
    const existing = projectMap.get(slug) ?? { cost: 0, input: 0, output: 0 };
    const sessionModel = s.model ?? "claude-opus-4-6";
    const p = getPricing(sessionModel);
    const cost =
      (s.input_tokens ?? 0) * p.input +
      (s.output_tokens ?? 0) * p.output +
      (s.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (s.cache_read_input_tokens ?? 0) * p.cacheRead;
    projectMap.set(slug, {
      cost: existing.cost + cost,
      input: existing.input + (s.input_tokens ?? 0),
      output: existing.output + (s.output_tokens ?? 0),
    });
  }

  const by_project: ProjectCost[] = [...projectMap.entries()]
    .map(([slug, data]) => ({
      slug,
      display_name: projectDisplayName(slug),
      estimated_cost: data.cost,
      input_tokens: data.input,
      output_tokens: data.output,
    }))
    .sort((a, b) => b.estimated_cost - a.estimated_cost)
    .slice(0, 20);

  const result: CostAnalytics = {
    total_cost: totalCost,
    total_savings: totalSavings,
    models,
    daily,
    hourly,
    by_project,
  };
  return NextResponse.json(result);
}
