import { describe, it, expect } from "vitest";
import {
  filterDailyByWindow,
  sumDailyCost,
  sumHourlyCost,
  sumCacheBreakdown,
} from "@/lib/costs-compute";
import type { DailyCost, HourlyCost } from "@/types/claude";

function dailyCost(overrides: Partial<DailyCost> = {}): DailyCost {
  return {
    date: "2026-04-01",
    costs: {},
    total: 0,
    cache_read_cost: 0,
    cache_write_cost: 0,
    cache_savings: 0,
    ...overrides,
  };
}

function hourlyCost(overrides: Partial<HourlyCost> = {}): HourlyCost {
  return {
    hour: "14:00",
    costs: {},
    total: 0,
    cache_read_cost: 0,
    cache_write_cost: 0,
    cache_savings: 0,
    ...overrides,
  };
}

describe("filterDailyByWindow", () => {
  const today = new Date().toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const daily: DailyCost[] = [
    dailyCost({ date: daysAgo(100), total: 1 }),
    dailyCost({ date: daysAgo(50), total: 2 }),
    dailyCost({ date: daysAgo(10), total: 3 }),
    dailyCost({ date: daysAgo(3), total: 4 }),
    dailyCost({ date: today, total: 5 }),
  ];

  it("returns all entries for 365 (All) window", () => {
    expect(filterDailyByWindow(daily, 365)).toHaveLength(5);
  });

  it("filters to last 90 days", () => {
    const result = filterDailyByWindow(daily, 90);
    expect(result).toHaveLength(4);
    expect(result.every((d) => d.date >= daysAgo(90))).toBe(true);
  });

  it("filters to last 30 days", () => {
    const result = filterDailyByWindow(daily, 30);
    expect(result).toHaveLength(3);
  });

  it("filters to last 7 days", () => {
    const result = filterDailyByWindow(daily, 7);
    expect(result).toHaveLength(2);
  });

  it("filters to last 1 day", () => {
    const result = filterDailyByWindow(daily, 1);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe(today);
  });

  it("returns empty array when no entries match", () => {
    const old = [dailyCost({ date: "2020-01-01", total: 1 })];
    expect(filterDailyByWindow(old, 1)).toHaveLength(0);
  });

  it("handles empty input", () => {
    expect(filterDailyByWindow([], 30)).toEqual([]);
  });
});

describe("sumDailyCost", () => {
  it("sums totals across entries", () => {
    const days = [
      dailyCost({ total: 1.5 }),
      dailyCost({ total: 2.5 }),
      dailyCost({ total: 3.0 }),
    ];
    expect(sumDailyCost(days)).toBeCloseTo(7.0);
  });

  it("returns 0 for empty array", () => {
    expect(sumDailyCost([])).toBe(0);
  });
});

describe("sumHourlyCost", () => {
  it("sums totals across entries", () => {
    const hours = [hourlyCost({ total: 0.5 }), hourlyCost({ total: 1.5 })];
    expect(sumHourlyCost(hours)).toBeCloseTo(2.0);
  });

  it("returns 0 for empty array", () => {
    expect(sumHourlyCost([])).toBe(0);
  });
});

describe("sumCacheBreakdown", () => {
  it("aggregates cache costs and savings", () => {
    const entries = [
      { cache_read_cost: 1, cache_write_cost: 2, cache_savings: 10 },
      { cache_read_cost: 3, cache_write_cost: 4, cache_savings: 20 },
    ];
    expect(sumCacheBreakdown(entries)).toEqual({
      cacheReadCost: 4,
      cacheWriteCost: 6,
      cacheSavings: 30,
    });
  });

  it("returns zeros for empty array", () => {
    expect(sumCacheBreakdown([])).toEqual({
      cacheReadCost: 0,
      cacheWriteCost: 0,
      cacheSavings: 0,
    });
  });
});
