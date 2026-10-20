import { Card, CardBody, CardHeader, Badge } from "@/components/ui/card";
import {
  DistributionBarChart,
  DistributionDonutChart,
  ScaleBarChart,
} from "@/components/analytics/charts";
import type { QuestionStats } from "@/lib/analytics/compute";
import { questionTypeLabel } from "@/lib/validation/survey";

type QuestionLike = { id: string; title: string; type: string };

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  detail,
  max,
}: {
  label: string;
  value: number;
  detail: string;
  max: number;
}) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-slate-700">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-500">{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${width}%` }} />
      </div>
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
  const typeLabel = questionTypeLabel(question.type);

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

        {stats.kind === "number" ? (
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
              <DistributionBarChart points={stats.points} />
            </div>
          )
        ) : null}

        {stats.kind === "nps" ? (
          stats.answered === 0 ? (
            <p className="text-sm text-slate-500">No answers yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatPill label="NPS" value={stats.score ?? "—"} />
                <StatPill label="Promoters" value={stats.promoters} />
                <StatPill label="Passives" value={stats.passives} />
                <StatPill label="Detractors" value={stats.detractors} />
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(stats.promoters / stats.answered) * 100}%` }}
                />
                <div
                  className="bg-amber-400"
                  style={{ width: `${(stats.passives / stats.answered) * 100}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${(stats.detractors / stats.answered) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Promoters: 9–10</span>
                <span>Passives: 7–8</span>
                <span>Detractors: 0–6</span>
              </div>
              <DistributionBarChart points={stats.points} />
            </div>
          )
        ) : null}

        {stats.kind === "email" ? (
          stats.answered === 0 ? (
            <p className="text-sm text-slate-500">No answers yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatPill label="Answered" value={stats.answered} />
                <StatPill label="Unique emails" value={stats.unique} />
                <StatPill label="Domains" value={stats.domains.length} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Top domains</p>
                  <div className="space-y-3">
                    {stats.domains.slice(0, 8).map((domain) => (
                      <ProgressRow
                        key={domain.label}
                        label={domain.label}
                        value={domain.count}
                        detail={`${domain.count} · ${domain.percentage}%`}
                        max={stats.answered}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Recent emails</p>
                  <ul className="space-y-2">
                    {stats.recentAnswers.map((email, index) => (
                      <li
                        key={`${email}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                      >
                        {email}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        ) : null}

        {stats.kind === "ranking" ? (
          stats.answered === 0 ? (
            <p className="text-sm text-slate-500">No answers yet.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Sorted by average rank (1 is best). Bars are relative to the worst average.
              </p>
              {stats.items.map((item, rankIndex) => {
                const worst = Math.max(
                  ...stats.items.map((entry) => entry.averageRank ?? 0),
                  1,
                );
                const score = item.averageRank === null ? 0 : worst - item.averageRank + 1;
                return (
                  <ProgressRow
                    key={item.label}
                    label={`${rankIndex + 1}. ${item.label}`}
                    value={score}
                    detail={
                      item.averageRank === null
                        ? "No rankings"
                        : `Avg ${item.averageRank} · ${item.firstPlace} first place`
                    }
                    max={worst}
                  />
                );
              })}
            </div>
          )
        ) : null}

        {stats.kind === "matrix" ? (
          stats.answered === 0 ? (
            <p className="text-sm text-slate-500">No answers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-3 text-left font-medium text-slate-700">Row</th>
                    {stats.rows[0]?.points.map((point) => (
                      <th
                        key={point.label}
                        className="px-2 py-2 text-center font-medium text-slate-700"
                      >
                        {point.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map((row) => (
                    <tr key={row.label} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2 pr-3 text-slate-700">{row.label}</td>
                      {row.points.map((point) => (
                        <td key={point.label} className="px-2 py-2 text-center">
                          <span
                            className="inline-flex min-w-16 items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-slate-700"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--color-indigo-600) ${
                                point.percentage * 0.9
                              }%, transparent)`,
                            }}
                          >
                            {point.count} · {point.percentage}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
