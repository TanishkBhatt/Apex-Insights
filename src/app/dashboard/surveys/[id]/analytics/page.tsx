import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Sparkles } from "lucide-react";
import { SurveyTabs } from "@/components/surveys/survey-tabs";
import { SourceToggle } from "@/components/analytics/source-toggle";
import { ExportButtons } from "@/components/analytics/export-buttons";
import { QuestionAnalytics } from "@/components/analytics/question-analytics";
import { SubmissionsTimelineChart } from "@/components/analytics/charts";
import { Alert, Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { computeAnalytics } from "@/lib/analytics/compute";
import { loadAnalytics, type AnalyticsSource } from "@/lib/analytics/load";
import { requireUser } from "@/lib/session";

const VALID_SOURCES: AnalyticsSource[] = ["real", "demo", "both"];

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { source: sourceParam } = await searchParams;
  const source: AnalyticsSource = VALID_SOURCES.includes(sourceParam as AnalyticsSource)
    ? (sourceParam as AnalyticsSource)
    : "real";

  const data = await loadAnalytics(user.id, id, source);
  if (!data) notFound();

  const { summary, perQuestion } = computeAnalytics(data.questions, data.rows);
  const totalForSource =
    source === "real" ? data.sources.real : source === "demo" ? data.sources.demo : data.sources.real + data.sources.demo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.survey.title} · real {data.sources.real} · demo {data.sources.demo}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButtons surveyId={id} source={source} />
          <SourceToggle surveyId={id} current={source} />
        </div>
      </div>

      <SurveyTabs surveyId={id} />

      {source !== "real" ? (
        <Alert tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" aria-hidden />
            {source === "demo"
              ? "You are viewing synthetic demo data only. Real submissions are excluded."
              : "You are viewing a combination of real and synthetic demo data. Demo rows are labelled at the source."}
          </span>
        </Alert>
      ) : null}

      {totalForSource === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<BarChart3 className="h-8 w-8" />}
              title="No data for this source"
              description={
                source === "real"
                  ? "Share your public link to collect real responses, or switch to demo data."
                  : "Generate a demo dataset from the Demo data tab to explore analytics."
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Responses
                </p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">
                  {summary.totalResponses}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Questions
                </p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">
                  {data.questions.length}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Latest real submission
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {summary.timeline.length > 0
                    ? summary.timeline[summary.timeline.length - 1].date
                    : "—"}
                </p>
              </CardBody>
            </Card>
          </div>

          {summary.timeline.length > 0 ? (
            <Card>
              <CardHeader
                title="Real submissions over time"
                description="Grouped by calendar day."
              />
              <CardBody>
                <SubmissionsTimelineChart points={summary.timeline} />
              </CardBody>
            </Card>
          ) : null}

          {data.questions.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  title="No questions yet"
                  description="Add questions on the Build tab to see per-question analytics."
                />
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-6">
              {data.questions.map((question, index) => {
                const stats = perQuestion.find((entry) => entry.questionId === question.id);
                if (!stats) return null;
                return (
                  <QuestionAnalytics
                    key={question.id}
                    question={question}
                    stats={stats.stats}
                    index={index}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
