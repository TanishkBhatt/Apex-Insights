import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Database } from "lucide-react";
import { SurveyTabs } from "@/components/surveys/survey-tabs";
import { DemoDataPanel } from "@/components/surveys/demo-data-panel";
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import {
  getDemoDatasetForOwner,
  getDemoResponseRowsForOwner,
} from "@/lib/synthetic/generator";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { surveys } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";

function renderValue(type: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (type === "yes_no") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default async function DemoDataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [survey] = await db
    .select({ id: surveys.id, title: surveys.title })
    .from(surveys)
    .where(and(eq(surveys.id, id), eq(surveys.ownerId, user.id)))
    .limit(1);
  if (!survey) notFound();

  const dataset = await getDemoDatasetForOwner(user.id, id);
  const preview = dataset
    ? await getDemoResponseRowsForOwner(user.id, id, 25)
    : null;

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
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Demo data</h1>
          <p className="mt-1 text-sm text-slate-500">
            Synthetic responses for {survey.title}, kept entirely separate from real submissions.
          </p>
        </div>
      </div>

      <SurveyTabs surveyId={id} />

      <Alert tone="info">
        Demo data lives in its own dataset table and is never mixed into real response counts,
        analytics, or exports unless you explicitly include it.
      </Alert>

      <DemoDataPanel surveyId={id} hasDataset={Boolean(dataset)} />

      {!dataset ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Database className="h-8 w-8" />}
              title="No demo data yet"
              description="Generate a deterministic dataset above to try out analytics and exports."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Dataset details"
              actions={<Badge tone="violet">generator {dataset.generatorVersion}</Badge>}
            />
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Seed</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-800">{dataset.seed}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Responses
                </p>
                <p className="mt-1 text-sm text-slate-800">{dataset.responseCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Generated
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  {formatDateTime(dataset.createdAt)}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Preview"
              description={`First ${preview?.responses.length ?? 0} of ${dataset.responseCount} demo responses.`}
            />
            <CardBody className="overflow-x-auto">
              {preview && preview.responses.length > 0 ? (
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-left font-medium text-slate-700">#</th>
                      {preview.responses[0].answers.map((answer) => (
                        <th
                          key={answer.questionId}
                          className="px-2 py-2 text-left font-medium text-slate-700"
                        >
                          {answer.questionTitle}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.responses.map((response) => (
                      <tr key={response.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-2 text-xs text-slate-500">{response.seedIndex + 1}</td>
                        {response.answers.map((answer) => (
                          <td
                            key={answer.questionId}
                            className="px-2 py-2 text-xs text-slate-600"
                          >
                            {renderValue(answer.type, answer.value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  title="Dataset is empty"
                  description="Regenerate the dataset to populate it."
                />
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
