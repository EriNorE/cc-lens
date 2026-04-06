"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ProjectSummary } from "@/types/claude";
import { formatTokens } from "@/lib/decode";

interface Props {
  projects: ProjectSummary[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-3 py-2 text-[13px]">
      <p className="text-muted-foreground font-bold">{label}</p>
      <p style={{ color: "var(--chart-1)" }}>
        {formatTokens(payload[0].value)} tokens
      </p>
      {payload[0].payload.sessions != null && (
        <p className="text-muted-foreground">
          {payload[0].payload.sessions} sessions
        </p>
      )}
    </div>
  );
}

export function ProjectActivityChart({ projects }: Props) {
  const data = projects
    .slice(0, 8)
    .map((p) => ({
      name:
        p.display_name.length > 20
          ? p.display_name.slice(0, 18) + "..."
          : p.display_name,
      fullName: p.display_name,
      value: (p.input_tokens ?? 0) + (p.output_tokens ?? 0),
      sessions: p.session_count ?? 0,
    }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        no project data
      </div>
    );
  }

  return (
    <div role="img" aria-label="Project activity chart">
      <ResponsiveContainer
        width="100%"
        height={Math.max(160, data.length * 32)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatTokens(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            fill="var(--chart-1)"
            radius={[0, 3, 3, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
