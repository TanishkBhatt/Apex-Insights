import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { SurveyTabs } from "@/components/surveys/survey-tabs";
import { DeleteResponseButton } from "@/components/responses/delete-response-button";
import { Card, CardBody } from "@/components/ui/card";
import { formatAnswerValue } from "@/lib/exports/formatters";
import { getResponseForOwner } from "@/lib/responses/service";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { questionTypeLabel } from "@/lib/validation/survey";

export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string; responseId: string }>;
}) {
  const user = await requireUser();
  const { id, responseId } = await params;
  const response = await getResponseForOwner(user.id, id, responseId);

  if (!response) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/surveys/${id}/responses`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to responses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Response details
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Submitted {formatDateTime(response.submittedAt)}
        </p>
      </div>

      <SurveyTabs surveyId={id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {response.answers.length} question
          {response.answers.length === 1 ? "" : "s"} in this survey
        </p>
        <DeleteResponseButton surveyId={id} responseId={response.id} />
      </div>

      <div className="space-y-3">
        {response.answers.map((answer, index) => {
          const formatted = formatAnswerValue(answer.type, answer.value);
          const answered = formatted.trim().length > 0;
          return (
            <Card key={answer.questionId}>
              <CardBody className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">
                    {index + 1}. {answer.questionTitle}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                    {questionTypeLabel(String(answer.type))}
                  </span>
                </div>
                {answered ? (
                  <p className="text-sm whitespace-pre-wrap text-slate-700">{formatted}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No answer</p>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
