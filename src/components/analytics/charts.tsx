"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DistributionPoint, TimelinePoint } from "@/lib/analytics/compute";

export const CHART_COLORS = [
  "#fe6e00",
  "#ffb96d",
  "#f5a524",
  "#d4d4d4",
  "#8a8a8a",
  "#7b3306",
  "#ffd7a8",
  "#874b00",
];

const GRID_STROKE = "#2e2e2e";
const TICK_FILL = "#9c9c9c";

export const TOOLTIP_STYLE = {
  backgroundColor: "#1f1f1f",
  border: "1px solid #3a3a3a",
  borderRadius: "0.5rem",
  color: "#f5f5f5",
} as const;

function truncate(label: string, max = 22): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function DistributionBarChart({ points }: { points: DistributionPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: TICK_FILL }}
            tickFormatter={(value: string) => truncate(value, 14)}
            interval={0}
            angle={points.length > 6 ? -20 : 0}
            textAnchor={points.length > 6 ? "end" : "middle"}
            height={points.length > 6 ? 70 : 40}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: TICK_FILL }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#f5f5f5" }} itemStyle={{ color: "#f5f5f5" }}
            formatter={(value, _name, entry) => {
              const point = entry?.payload as DistributionPoint | undefined;
              return [`${Number(value)} (${point?.percentage ?? 0}%)`, "Responses"];
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {points.map((point, index) => (
              <Cell key={point.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionDonutChart({ points }: { points: DistributionPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={points}
            dataKey="count"
            nameKey="label"
            innerRadius="45%"
            outerRadius="75%"
            paddingAngle={2}
          >
            {points.map((point, index) => (
              <Cell key={point.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#f5f5f5" }} itemStyle={{ color: "#f5f5f5" }}
            formatter={(value, _name, entry) => {
              const point = entry?.payload as DistributionPoint | undefined;
              return [`${Number(value)} (${point?.percentage ?? 0}%)`, point?.label ?? "Responses"];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScaleBarChart({
  points,
  min,
  max,
}: {
  points: DistributionPoint[];
  min?: number | null;
  max?: number | null;
}) {
  const filled = (() => {
    if (min === null || min === undefined || max === null || max === undefined) return points;
    const byLabel = new Map(points.map((point) => [point.label, point]));
    const list: DistributionPoint[] = [];
    for (let value = min; value <= max; value += 1) {
      const key = String(value);
      list.push(byLabel.get(key) ?? { label: key, count: 0, percentage: 0 });
    }
    return list;
  })();

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filled} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: TICK_FILL }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: TICK_FILL }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#f5f5f5" }} itemStyle={{ color: "#f5f5f5" }} formatter={(value) => [Number(value), "Responses"]} />
          <Bar dataKey="count" fill="#fe6e00" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SubmissionsTimelineChart({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No real submissions to plot yet.
      </p>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: TICK_FILL }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: TICK_FILL }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#f5f5f5" }} itemStyle={{ color: "#f5f5f5" }} formatter={(value) => [Number(value), "Responses"]} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#fe6e00"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
