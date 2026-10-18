import { Card, CardBody, CardHeader, Badge } from "@/components/ui/card";
import {
  DistributionBarChart,
  DistributionDonutChart,
  ScaleBarChart,
} from "@/components/analytics/charts";
import type { QuestionStats } from "@/lib/analytics/compute";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/validation/survey";

type QuestionLike = { id: string; title: string; type: QuestionType | string };

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function QuestionAnalytics({
  question,
  stats,
  index,
}: {
  question: QuestionLike;
  stats: QuestionStats;
  index: number;
}) {
  const typeLabel =
    QUESTION_TYPE_LABELS[question.type as QuestionType] ?? String(question.type);

  return (
    <Card>
      <CardHeader
        title={`${index + 1}. ${question.title}`}
        description={`${typeLabel} · ${stats.answered} answered · ${stats.unanswered} skipped`}
      />
      <CardBody className="space-y-4">
        {stats.kind === "choice" ? (
          stats.points.length === 0 ? (
            <p className="text-sm text-slate-500">No answers yet.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <DistributionBarChart points={stats.points} />
              <div className="space-y-3">
                <DistributionDonutChart points={stats.points} />
                <ul className="space-y-1.5">
                  {stats.points.map((point) => (
                    <li
                      key={point.label}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-slate-700">{point.label}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {point.count} · {point.percentage}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        ) : null}

        {stats.kind === "boolean" ? (
          stats.points.length === 0 ? (
            <p className="text-sm text-slate-500">No answers yet.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <DistributionDonutChart points={stats.points} />
              <div className="space-y-3 self-center">
                {stats.points.map((point) => (
                  <div key={point.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{point.label}</span>
                      <span className="tabular-nums text-slate-500">
                        {point.count} · {point.percentage}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${point.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : null}

        {stats.kind === "scale" ? (
          stats.answered === 0 ? (
            <p className="text-sm text-slate-500">No answers yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatPill label="Mean" value={stats.mean ?? "—"} />
                <StatPill label="Median" value={stats.median ?? "—"} />
                <StatPill label="Min" value={stats.min ?? "—"} />
                <StatPill label="Max" value={stats.max ?? "—"} />
              </div>
              <ScaleBarChart points={stats.points} min={stats.min} max={stats.max} />
            </div>
          )
        ) : null}

        {stats.kind === "text" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatPill label="Answered" value={stats.answered} />
              <StatPill label="Skipped" value={stats.unanswered} />
            </div>
            {stats.answered === 0 ? (
              <p className="text-sm text-slate-500">No answers yet.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Most common words</p>
                  {stats.topWords.length === 0 ? (
                    <p className="text-sm text-slate-500">Not enough text to analyse.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {stats.topWords.map((word) => (
                        <Badge key={word.word} tone="indigo">
                          {word.word} · {word.count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Recent answers</p>
                  <ul className="space-y-2">
                    {stats.recentAnswers.map((answer, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                      >
                        {answer}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
