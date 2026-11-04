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

const CHART_COLORS = [
  "#c2410c",
  "#ea580c",
  "#f97316",
  "#fb923c",
  "#d97706",
  "#a16207",
  "#c9b8a6",
  "#806c5a",
];

type Palette = {
  colors: string[];
  primary: string;
  grid: string;
  tick: string;
  tooltip: {
    backgroundColor: string;
    border: string;
    borderRadius: string;
    color: string;
  };
  tooltipText: string;
};

const PALETTE: Palette = {
  colors: CHART_COLORS,
  primary: "#c2410c",
  grid: "#e9ded2",
  tick: "#806c5a",
  tooltip: {
    backgroundColor: "#ffffff",
    border: "1px solid #e9ded2",
    borderRadius: "0.5rem",
    color: "#2b231d",
  },
  tooltipText: "#2b231d",
};

function truncate(label: string, max = 22): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function DistributionBarChart({ points }: { points: DistributionPoint[] }) {
  const palette = PALETTE;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: palette.tick }}
            tickFormatter={(value: string) => truncate(value, 14)}
            interval={0}
            angle={points.length > 6 ? -20 : 0}
            textAnchor={points.length > 6 ? "end" : "middle"}
            height={points.length > 6 ? 70 : 40}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: palette.tick }} />
          <Tooltip
            contentStyle={palette.tooltip}
            labelStyle={{ color: palette.tooltipText }}
            itemStyle={{ color: palette.tooltipText }}
            formatter={(value, _name, entry) => {
              const point = entry?.payload as DistributionPoint | undefined;
              return [`${Number(value)} (${point?.percentage ?? 0}%)`, "Responses"];
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {points.map((point, index) => (
              <Cell key={point.label} fill={palette.colors[index % palette.colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionDonutChart({ points }: { points: DistributionPoint[] }) {
  const palette = PALETTE;
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
              <Cell key={point.label} fill={palette.colors[index % palette.colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={palette.tooltip}
            labelStyle={{ color: palette.tooltipText }}
            itemStyle={{ color: palette.tooltipText }}
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
  const palette = PALETTE;
  const numericPoints = points.every((point) => Number.isFinite(Number(point.label)));
  const filled = (() => {
    if (
      min === null ||
      min === undefined ||
      max === null ||
      max === undefined ||
      !numericPoints ||
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      max - min > 20
    ) {
      return numericPoints
        ? [...points].sort((a, b) => Number(a.label) - Number(b.label))
        : points;
    }
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
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: palette.tick }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: palette.tick }} />
          <Tooltip
            contentStyle={palette.tooltip}
            labelStyle={{ color: palette.tooltipText }}
            itemStyle={{ color: palette.tooltipText }}
            formatter={(value) => [Number(value), "Responses"]}
          />
          <Bar dataKey="count" fill={palette.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SubmissionsTimelineChart({ points }: { points: TimelinePoint[] }) {
  const palette = PALETTE;
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
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: palette.tick }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: palette.tick }} />
          <Tooltip
            contentStyle={palette.tooltip}
            labelStyle={{ color: palette.tooltipText }}
            itemStyle={{ color: palette.tooltipText }}
            formatter={(value) => [Number(value), "Responses"]}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={palette.primary}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
