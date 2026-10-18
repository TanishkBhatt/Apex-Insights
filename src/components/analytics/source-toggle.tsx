"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AnalyticsSource } from "@/lib/analytics/load";

const OPTIONS: Array<{ value: AnalyticsSource; label: string; description: string }> = [
  { value: "real", label: "Real", description: "Genuine submissions only" },
  { value: "demo", label: "Demo", description: "Synthetic dataset only" },
  { value: "both", label: "Both", description: "Real and demo combined" },
];

export function SourceToggle({
  surveyId,
  current,
}: {
  surveyId: string;
  current: AnalyticsSource;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: AnalyticsSource) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("source", value);
    router.push(`/dashboard/surveys/${surveyId}/analytics?${params.toString()}`);
  }

  return (
    <div
      role="group"
      aria-label="Data source"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.description}
            onClick={() => select(option.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-white text-indigo-700 shadow-sm"
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
