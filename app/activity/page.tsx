"use client";

import useSWR from "swr";
import { TopBar } from "@/components/layout/top-bar";
import { ActivityHeatmap } from "@/components/overview/activity-heatmap";
import { PeakHoursChart } from "@/components/overview/peak-hours-chart";
import { DayOfWeekChart } from "@/components/activity/day-of-week-chart";
import { StreakCard } from "@/components/activity/streak-card";
import { UsageOverTimeChart } from "@/components/overview/usage-over-time-chart";
import type { DailyActivity } from "@/types/claude";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface ActivityData {
  daily_activity: DailyActivity[];
  hour_counts: Array<{ hour: number; count: number }>;
  dow_counts: Array<{ day: string; count: number }>;
  streaks: { current: number; longest: number };
  most_active_day: string;
  most_active_day_msgs: number;
  total_active_days: number;
}

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

export default function ActivityPage() {
  const { data, error, isLoading } = useSWR<ActivityData>(
    "/api/activity",
    fetcher,
    { refreshInterval: 5_000 },
  );

  // hourCounts as Record<string, number> for PeakHoursChart
  const hourCounts = data
    ? Object.fromEntries(data.hour_counts.map((h) => [String(h.hour), h.count]))
    : {};

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="claude-code-analytics · activity"
        subtitle="patterns, streaks, peak hours"
      />
      <div className="p-6 space-y-6">
        {error && (
          <p className="text-[#f87171] text-sm font-mono">
            Failed to load data. Try refreshing.
          </p>
        )}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {data && data.total_active_days === 0 && (
          <p className="text-sm text-muted-foreground py-12 text-center font-mono">
            No activity data yet. Start a Claude Code session to see your usage
            patterns.
          </p>
        )}
        {data && data.total_active_days > 0 && (
          <>
            {/* Streaks */}
            <Card title="Streaks & Highlights">
              <StreakCard
                current={data.streaks.current}
                longest={data.streaks.longest}
                totalActiveDays={data.total_active_days}
                mostActiveDay={data.most_active_day}
                mostActiveDayMsgs={data.most_active_day_msgs}
              />
            </Card>

            {/* Activity calendar heatmap */}
            <Card title="Activity Calendar">
              <ActivityHeatmap data={data.daily_activity} />
            </Card>

            {/* Usage over time */}
            <Card title="Usage Over Time">
              <UsageOverTimeChart data={data.daily_activity} days={90} />
            </Card>

            {/* Peak hours + Day of week */}
            <div className="grid grid-cols-2 gap-4">
              <Card title="Peak Hours">
                <PeakHoursChart hourCounts={hourCounts} />
              </Card>
              <Card title="Day of Week Patterns">
                <DayOfWeekChart data={data.dow_counts} />
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
