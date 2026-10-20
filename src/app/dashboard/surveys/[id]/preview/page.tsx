import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { QuestionField } from "@/components/surveys/question-field";
import { StatusBadge } from "@/components/surveys/survey-status-bar";
import { SurveyTabs } from "@/components/surveys/survey-tabs";
import { Alert, Card, CardBody, EmptyState } from "@/components/ui/card";
import { getSurveyForOwner } from "@/lib/surveys/service";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Preview survey" };

export default async function PreviewSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const survey = await getSurveyForOwner(user.id, id);

  if (!survey) notFound();

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
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            Preview
            <StatusBadge status={survey.status} />
          </h1>
        </div>
      </div>

      <SurveyTabs surveyId={survey.id} />

      <Alert tone="info">
        <span className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" aria-hidden />
          This is a preview. Nothing you select here is stored, and no response is created.
        </span>
      </Alert>

      <Card>
        <CardBody className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-semibold text-slate-900">{survey.title}</h2>
            {survey.description ? (
              <p className="mt-2 text-sm text-slate-600">{survey.description}</p>
            ) : null}
          </div>

          {survey.questions.length === 0 ? (
            <EmptyState
              title="No questions yet"
              description="Add questions in the Build tab to preview your survey."
            />
          ) : (
            <ol className="space-y-6">
              {survey.questions.map((question, index) => (
                <li key={question.id} className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {index + 1}. {question.title}
                      {question.required ? (
                        <span className="ml-1 text-red-600" aria-label="required">
                          *
                        </span>
                      ) : null}
                    </p>
                    {question.config.helpText ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {question.config.helpText}
                      </p>
                    ) : null}
                  </div>
                  <QuestionField
                    question={question}
                    value={undefined}
                    disabled
                    namePrefix="preview"
                  />
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
