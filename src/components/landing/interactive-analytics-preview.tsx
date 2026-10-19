"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BASE_RATING = [
  { label: "Excellent", count: 42 },
  { label: "Good", count: 33 },
  { label: "Average", count: 18 },
  { label: "Poor", count: 7 },
];

const BASE_SCALE = [3, 7, 12, 9, 4];

export function InteractiveAnalyticsPreview() {
  const [ratingVotes, setRatingVotes] = useState<number[]>(BASE_RATING.map(() => 0));
  const [myRating, setMyRating] = useState<number | null>(null);
  const [scaleVotes, setScaleVotes] = useState<number[]>(BASE_SCALE.map(() => 0));
  const [myScale, setMyScale] = useState<number | null>(null);

  const ratingCounts = BASE_RATING.map((row, i) => row.count + ratingVotes[i]);
  const ratingTotal = ratingCounts.reduce((sum, count) => sum + count, 0);

  const scaleCounts = BASE_SCALE.map((base, i) => base + scaleVotes[i]);
  const scaleTotal = scaleCounts.reduce((sum, count) => sum + count, 0);
  const scaleAverage =
    scaleCounts.reduce((sum, count, i) => sum + count * (i + 1), 0) / scaleTotal;

  function voteRating(index: number) {
    setRatingVotes((prev) => {
      const next = [...prev];
      if (myRating !== null && myRating !== index) next[myRating] -= 1;
      next[index] += myRating === index ? 0 : 1;
      return next;
    });
    setMyRating((prev) => (prev === index ? prev : index));
  }

  function voteScale(value: number) {
    setScaleVotes((prev) => {
      const next = [...prev];
      if (myScale !== null && myScale !== value) next[myScale - 1] -= 1;
      next[value - 1] += myScale === value ? 0 : 1;
      return next;
    });
    setMyScale((prev) => (prev === value ? prev : value));
  }

  function reset() {
    setRatingVotes(BASE_RATING.map(() => 0));
    setMyRating(null);
    setScaleVotes(BASE_SCALE.map(() => 0));
    setMyScale(null);
  }

  return (
    <Card className="animate-fade-up overflow-hidden [animation-delay:200ms]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
        <p className="text-sm font-medium text-slate-700">
          Course feedback survey · Interactive demo
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          Live
        </span>
      </div>
      <CardBody className="space-y-5">
        <div>
          <p className="text-sm font-medium text-slate-700">
            1. How would you rate the workshop?
          </p>
          <div className="mt-3 space-y-2">
            {BASE_RATING.map((row, index) => {
              const count = ratingCounts[index];
              const percentage = Math.round((count / ratingTotal) * 100);
              const selected = myRating === index;
              return (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => voteRating(index)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-2.5 py-1.5 text-left transition",
                    selected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "w-20 shrink-0 text-xs",
                      selected ? "font-semibold text-indigo-700" : "text-slate-500",
                    )}
                  >
                    {row.label}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-600">
                    {percentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">
            2. How clear were the explanations? ({scaleAverage.toFixed(1)} avg)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => voteScale(value)}
                aria-pressed={myScale === value}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition",
                  myScale === value
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50",
                )}
              >
                {value}
              </button>
            ))}
            <span className="ml-1 self-center text-xs text-slate-500">
              {scaleTotal} responses
            </span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p>
            Synthetic demo data — click any answer to see the charts react. Not
            real survey results.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-1 font-medium text-amber-800 underline-offset-2 hover:underline"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Reset
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
