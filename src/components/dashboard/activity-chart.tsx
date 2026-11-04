"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyActivityPoint } from "@/lib/dashboard/activity-shared";

function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DashboardActivityChart({
  points,
}: {
  points: DailyActivityPoint[];
}) {
  const primary = "#c2410c";
  const grid = "#e9ded2";
  const tick = "#806c5a";
  const total = points.reduce((sum, point) => sum + point.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
        No real responses in the last {points.length} days.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
        >
          <defs>
            <linearGradient id="dashboard-activity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: tick }}
            tickFormatter={formatDay}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: tick }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e9ded2",
              borderRadius: "0.5rem",
              color: "#2b231d",
              fontSize: 12,
            }}
            labelFormatter={(value) => formatDay(String(value))}
            formatter={(value) => [Number(value), "Responses"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={primary}
            strokeWidth={2}
            fill="url(#dashboard-activity)"
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
