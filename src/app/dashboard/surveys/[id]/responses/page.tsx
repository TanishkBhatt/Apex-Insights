import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SurveyTabs } from "@/components/surveys/survey-tabs";
import { ExportButtons } from "@/components/analytics/export-buttons";
import { Alert, Card, CardBody, EmptyState } from "@/components/ui/card";
import { listResponsesForOwner } from "@/lib/responses/service";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";

function renderValue(type: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (type === "yes_no") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const result = await listResponsesForOwner(user.id, id, 50);

  if (!result) notFound();

  const { responses, total } = result;

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
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Real responses</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} real response{total === 1 ? "" : "s"}
          </p>
        </div>
        <ExportButtons surveyId={id} source="real" />
      </div>

      <SurveyTabs surveyId={id} />

      {responses.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="No real responses yet"
              description="Share your public link to start collecting genuine responses. Demo data is managed separately."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <Alert tone="info">
            Showing the latest {responses.length} responses. Use the export buttons above to
            download the full dataset.
          </Alert>
          <Card>
            <CardBody className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 text-left font-medium text-slate-700">Submitted at</th>
                    {responses[0].answers.map((answer) => (
                      <th key={answer.questionId} className="px-2 py-2 text-left font-medium text-slate-700">
                        {answer.questionTitle}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => (
                    <tr key={response.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2 text-xs text-slate-500">{formatDateTime(response.submittedAt)}</td>
                      {response.answers.map((answer) => (
                        <td key={answer.questionId} className="px-2 py-2 text-xs text-slate-600">
                          {renderValue(answer.type, answer.value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
