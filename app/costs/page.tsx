"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { TopBar } from "@/components/layout/top-bar";
import {
  CostOverTimeChart,
  type CostWindow,
} from "@/components/costs/cost-over-time-chart";
import { CostByProjectChart } from "@/components/costs/cost-by-project-chart";
import { ModelTokenTable } from "@/components/costs/model-token-table";
import { CacheEfficiencyPanel } from "@/components/costs/cache-efficiency-panel";
import { formatCost } from "@/lib/decode";
import { PRICING } from "@/lib/pricing";
import { logger } from "@/lib/logger";
import {
  filterDailyByWindow,
  sumDailyCost,
  sumHourlyCost,
} from "@/lib/costs-compute";
import type { CostAnalytics } from "@/types/claude";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded bg-card p-4">
      <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function windowLabel(w: CostWindow): string {
  if (w === 365) return "all time";
  return `last ${w}d`;
}

export default function CostsPage() {
  const { data, error, isLoading } = useSWR<CostAnalytics>(
    "/api/costs",
    fetcher,
    { refreshInterval: 5_000 },
  );
  const [costWindow, setCostWindow] = useState<CostWindow>(30);

  useEffect(() => {
    if (error) logger.error("Failed to load costs", { error: String(error) });
  }, [error]);

  const filtered = useMemo(() => {
    if (!data) return null;

    // 1d: sum hourly data (last 24h)
    if (costWindow === 1) {
      return { cost: sumHourlyCost(data.hourly ?? []), savings: 0 };
    }

    // 7d/30d/90d/All: use shared filtering utility (single source of truth)
    const days = filterDailyByWindow(data.daily, costWindow);
    const cost = sumDailyCost(days);
    // For "All": fall back to stats-cache if JSONL daily is empty
    const finalCost = costWindow === 365 && cost === 0 ? data.total_cost : cost;
    const savings = costWindow === 365 ? data.total_savings : 0;
    return { cost: finalCost, savings };
  }, [data, costWindow]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="claude-code-analytics · costs"
        subtitle="estimated spend from ~/.claude/"
      />
      <div className="p-6 space-y-6">
        {error && (
          <p className="text-[#f87171] text-sm font-mono">
            Failed to load cost data
          </p>
        )}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {data && filtered && (
          <>
            {/* Hero row */}
            <div className="flex flex-wrap gap-6 py-3 border-b border-border items-center">
              <div>
                <p className="text-[12px] text-muted-foreground uppercase tracking-wider">
                  Estimated Cost{" "}
                  <span className="text-foreground/50">
                    ({windowLabel(costWindow)})
                  </span>
                </p>
                <p className="text-2xl font-bold text-[#d97706]">
                  {formatCost(filtered.cost)}
                </p>
                {costWindow === 365 &&
                  data.cache_read_cost + data.cache_write_cost > 0 && (
                    <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">
                      incl. {formatCost(data.cache_read_cost)} cache read +{" "}
                      {formatCost(data.cache_write_cost)} cache write
                    </p>
                  )}
              </div>
              {filtered.savings > 0 && (
                <>
                  <span className="text-border">·</span>
                  <div>
                    <p className="text-[12px] text-muted-foreground uppercase tracking-wider">
                      Cache Savings
                    </p>
                    <p className="text-xl font-bold text-[#34d399]">
                      {formatCost(filtered.savings)}
                    </p>
                  </div>
                  <span className="text-border">·</span>
                  <div>
                    <p className="text-[12px] text-muted-foreground uppercase tracking-wider">
                      Without Cache
                    </p>
                    <p className="text-xl font-bold text-red-400">
                      {formatCost(filtered.cost + filtered.savings)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Cost over time */}
            {(data.daily.length > 0 || (data.hourly ?? []).length > 0) && (
              <Card title="Cost Over Time">
                <CostOverTimeChart
                  daily={data.daily}
                  hourly={data.hourly ?? []}
                  window={costWindow}
                  onWindowChange={setCostWindow}
                />
              </Card>
            )}

            {/* Cost by project */}
            {data.by_project.length > 0 && (
              <Card title="Cost by Project">
                <CostByProjectChart projects={data.by_project} />
              </Card>
            )}

            {/* Per-model table */}
            <Card title="Per-Model Token Breakdown">
              <ModelTokenTable models={data.models} />
            </Card>

            {/* Cache efficiency */}
            <Card title="Cache Efficiency (all time)">
              <CacheEfficiencyPanel
                models={data.models}
                totalSavings={data.total_savings}
              />
            </Card>

            {/* Pricing reference */}
            <Card title="Pricing Reference — Estimates Only">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Model",
                        "Input /MTok",
                        "Output /MTok",
                        "Cache Write /MTok",
                        "Cache Read /MTok",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`py-2 text-[12px] font-bold text-muted-foreground uppercase tracking-wider ${h === "Model" ? "text-left" : "text-right"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PRICING).map(([model, p]) => (
                      <tr key={model} className="border-b border-border/30">
                        <td className="py-2 text-foreground/80">{model}</td>
                        <td className="py-2 text-right text-[#60a5fa]">
                          ${(p.input * 1_000_000).toFixed(2)}
                        </td>
                        <td className="py-2 text-right text-[#d97706]">
                          ${(p.output * 1_000_000).toFixed(2)}
                        </td>
                        <td className="py-2 text-right text-[#a78bfa]">
                          ${(p.cacheWrite * 1_000_000).toFixed(2)}
                        </td>
                        <td className="py-2 text-right text-[#34d399]">
                          ${(p.cacheRead * 1_000_000).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[12px] text-muted-foreground/50 mt-2">
                  Note: These are estimates. Update pricing in{" "}
                  <code className="text-muted-foreground">lib/pricing.ts</code>
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
