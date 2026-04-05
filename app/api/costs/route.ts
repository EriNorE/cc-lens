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
  StatsCache,
  SessionMeta,
} from "@/types/claude";

export const dynamic = "force-dynamic";

type CostBucket = {
  costs: Record<string, number>;
  total: number;
  cache_read_cost: number;
  cache_write_cost: number;
  cache_savings: number;
};

function emptyBucket(): CostBucket {
  return {
    costs: {},
    total: 0,
    cache_read_cost: 0,
    cache_write_cost: 0,
    cache_savings: 0,
  };
}

function buildModelBreakdown(stats: StatsCache): {
  models: ModelCostBreakdown[];
  totalCost: number;
  totalSavings: number;
} {
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
  return { models, totalCost, totalSavings };
}

function buildDailyHourlyCosts(sessions: SessionMeta[]): {
  daily: DailyCost[];
  hourly: HourlyCost[];
  totalCacheReadCost: number;
  totalCacheWriteCost: number;
} {
  const dailyMap = new Map<string, CostBucket>();
  const hourlyMap = new Map<string, CostBucket>();
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let totalCacheReadCost = 0;
  let totalCacheWriteCost = 0;

  for (const s of sessions) {
    const ts = s.start_time ?? "";
    if (!ts) continue;
    const date = ts.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const sessionModel = s.model ?? "claude-opus-4-6";
    const p = getPricing(sessionModel);
    const cacheReadCost = (s.cache_read_input_tokens ?? 0) * p.cacheRead;
    const cacheWriteCost = (s.cache_creation_input_tokens ?? 0) * p.cacheWrite;
    const cost =
      (s.input_tokens ?? 0) * p.input +
      (s.output_tokens ?? 0) * p.output +
      cacheWriteCost +
      cacheReadCost;
    const cacheSavings =
      (s.cache_read_input_tokens ?? 0) * (p.input - p.cacheRead);
    totalCacheReadCost += cacheReadCost;
    totalCacheWriteCost += cacheWriteCost;

    const dayEntry = dailyMap.get(date) ?? emptyBucket();
    dayEntry.total += cost;
    dayEntry.cache_read_cost += cacheReadCost;
    dayEntry.cache_write_cost += cacheWriteCost;
    dayEntry.cache_savings += cacheSavings;
    dayEntry.costs[sessionModel] = (dayEntry.costs[sessionModel] ?? 0) + cost;
    dailyMap.set(date, dayEntry);

    const sessionTime = new Date(ts);
    if (sessionTime >= cutoff24h) {
      const mm = String(sessionTime.getMonth() + 1).padStart(2, "0");
      const dd = String(sessionTime.getDate()).padStart(2, "0");
      const hh = String(sessionTime.getHours()).padStart(2, "0");
      const hourLabel = `${mm}-${dd} ${hh}:00`;
      const hourEntry = hourlyMap.get(hourLabel) ?? emptyBucket();
      hourEntry.total += cost;
      hourEntry.cache_read_cost += cacheReadCost;
      hourEntry.cache_write_cost += cacheWriteCost;
      hourEntry.cache_savings += cacheSavings;
      hourEntry.costs[sessionModel] =
        (hourEntry.costs[sessionModel] ?? 0) + cost;
      hourlyMap.set(hourLabel, hourEntry);
    }
  }

  const daily: DailyCost[] = [...dailyMap.entries()]
    .map(([date, b]) => ({
      date,
      costs: b.costs,
      total: b.total,
      cache_read_cost: b.cache_read_cost,
      cache_write_cost: b.cache_write_cost,
      cache_savings: b.cache_savings,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const hourly: HourlyCost[] = [...hourlyMap.entries()]
    .map(([hour, b]) => ({
      hour,
      costs: b.costs,
      total: b.total,
      cache_read_cost: b.cache_read_cost,
      cache_write_cost: b.cache_write_cost,
      cache_savings: b.cache_savings,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  return { daily, hourly, totalCacheReadCost, totalCacheWriteCost };
}

function buildProjectCosts(sessions: SessionMeta[]): ProjectCost[] {
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

  return [...projectMap.entries()]
    .map(([slug, data]) => ({
      slug,
      display_name: projectDisplayName(slug),
      estimated_cost: data.cost,
      input_tokens: data.input,
      output_tokens: data.output,
    }))
    .sort((a, b) => b.estimated_cost - a.estimated_cost)
    .slice(0, 20);
}

export async function GET() {
  const [stats, sessions] = await Promise.all([
    readStatsCache(),
    getSessions(),
  ]);

  if (!stats) {
    return NextResponse.json(
      { error: "Stats cache unavailable" },
      { status: 404 },
    );
  }

  const { models, totalCost, totalSavings } = buildModelBreakdown(stats);
  const { daily, hourly, totalCacheReadCost, totalCacheWriteCost } =
    buildDailyHourlyCosts(sessions);
  const by_project = buildProjectCosts(sessions);

  return NextResponse.json({
    total_cost: totalCost,
    total_savings: totalSavings,
    cache_read_cost: totalCacheReadCost,
    cache_write_cost: totalCacheWriteCost,
    models,
    daily,
    hourly,
    by_project,
  } satisfies CostAnalytics);
}
