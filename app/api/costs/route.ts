import { NextResponse } from "next/server";
import { readStatsCache, getSessions } from "@/lib/claude-reader";
import {
  estimateTotalCostFromModel,
  estimateCostFromUsage,
  cacheEfficiency,
  getPricing,
  PRICING,
} from "@/lib/pricing";
import { projectDisplayName } from "@/lib/decode";
import type {
  CostAnalytics,
  ModelCostBreakdown,
  DailyCost,
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

  // ── Per-model breakdown ────────────────────────────────────────────────────
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

  // ── Daily cost from stats-cache ───────────────────────────────────────────
  const dailyMap = new Map<
    string,
    { costs: Record<string, number>; total: number }
  >();

  for (const d of stats.dailyModelTokens ?? stats.tokensByDate ?? []) {
    const costs: Record<string, number> = {};
    let dayTotal = 0;
    for (const [model, tokens] of Object.entries(d.tokensByModel ?? {})) {
      const p = getPricing(model);
      const cost = tokens * p.input * 0.5 + tokens * p.output * 0.5;
      costs[model] = cost;
      dayTotal += cost;
    }
    dailyMap.set(d.date, { costs, total: dayTotal });
  }

  // ── Fill gaps from JSONL sessions (covers dates after stats-cache stops) ──
  for (const s of sessions) {
    const date = (s.start_time ?? "").slice(0, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (dailyMap.has(date)) continue; // stats-cache data is more accurate

    const cost = estimateCostFromUsage("claude-opus-4-6", {
      input_tokens: s.input_tokens ?? 0,
      output_tokens: s.output_tokens ?? 0,
      cache_creation_input_tokens: s.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: s.cache_read_input_tokens ?? 0,
    });

    const existing = dailyMap.get(date);
    if (existing) {
      existing.total += cost;
      existing.costs["claude-opus-4-6"] =
        (existing.costs["claude-opus-4-6"] ?? 0) + cost;
    } else {
      dailyMap.set(date, { costs: { "claude-opus-4-6": cost }, total: cost });
    }
  }

  const daily: DailyCost[] = [...dailyMap.entries()]
    .map(([date, { costs, total }]) => ({ date, costs, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Cost by project ────────────────────────────────────────────────────────
  const projectMap = new Map<
    string,
    { cost: number; input: number; output: number }
  >();
  for (const s of sessions) {
    const pp = s.project_path ?? "";
    const slug = pp;
    const existing = projectMap.get(slug) ?? { cost: 0, input: 0, output: 0 };
    const cost = estimateTotalCostFromModel("claude-opus-4-6", {
      inputTokens: s.input_tokens ?? 0,
      outputTokens: s.output_tokens ?? 0,
      cacheCreationInputTokens: s.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: s.cache_read_input_tokens ?? 0,
      costUSD: 0,
      webSearchRequests: 0,
    });
    projectMap.set(slug, {
      cost: existing.cost + cost,
      input: existing.input + (s.input_tokens ?? 0),
      output: existing.output + (s.output_tokens ?? 0),
    });
  }

  const by_project: ProjectCost[] = [...projectMap.entries()]
    .map(([slug, data]) => {
      const projectPath = slug;
      return {
        slug,
        display_name: projectDisplayName(projectPath),
        estimated_cost: data.cost,
        input_tokens: data.input,
        output_tokens: data.output,
      };
    })
    .sort((a, b) => b.estimated_cost - a.estimated_cost)
    .slice(0, 20);

  const result: CostAnalytics = {
    total_cost: totalCost,
    total_savings: totalSavings,
    models,
    daily,
    by_project,
  };
  return NextResponse.json(result);
}
