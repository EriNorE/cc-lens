import type { DailyCost, HourlyCost } from "@/types/claude";

export type CostWindow = 1 | 7 | 30 | 90 | 365;

/** Filter daily costs by time window — single source of truth for date cutoff.
 *  Uses UTC dates to match the API route (route.ts slices ISO timestamps). */
export function filterDailyByWindow(
  daily: DailyCost[],
  window: CostWindow,
): DailyCost[] {
  if (window === 365) return daily;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - window);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return daily.filter((d) => d.date >= cutoffStr);
}

/** Sum total cost across daily entries */
export function sumDailyCost(days: DailyCost[]): number {
  return days.reduce((sum, d) => sum + d.total, 0);
}

/** Sum total cost across hourly entries */
export function sumHourlyCost(hours: HourlyCost[]): number {
  return hours.reduce((sum, h) => sum + h.total, 0);
}

/** Aggregate cache cost breakdown and savings from daily or hourly entries */
export function sumCacheBreakdown(
  entries: Array<{
    cache_read_cost: number;
    cache_write_cost: number;
    cache_savings: number;
  }>,
): { cacheReadCost: number; cacheWriteCost: number; cacheSavings: number } {
  let cacheReadCost = 0;
  let cacheWriteCost = 0;
  let cacheSavings = 0;
  for (const e of entries) {
    cacheReadCost += e.cache_read_cost;
    cacheWriteCost += e.cache_write_cost;
    cacheSavings += e.cache_savings;
  }
  return { cacheReadCost, cacheWriteCost, cacheSavings };
}
