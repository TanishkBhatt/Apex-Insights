"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/lib/analytics/compute";

const OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All time" },
];

export function RangeToggle({
  surveyId,
  current,
}: {
  surveyId: string;
  current: AnalyticsRange;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: AnalyticsRange) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("range");
    else params.set("range", value);
    const search = params.toString();
    router.push(
      `/dashboard/surveys/${surveyId}/analytics${search ? `?${search}` : ""}`,
    );
  }

  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => select(option.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-surface text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
