import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SurveyEditor } from "@/components/surveys/survey-editor";
import { SurveyStatusBar } from "@/components/surveys/survey-status-bar";
import { SurveyTabs } from "@/components/surveys/survey-tabs";
import { surveyToEditor } from "@/lib/surveys/editor";
import { publicSurveyUrl, getSurveyForOwner } from "@/lib/surveys/service";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Edit survey" };

export default async function EditSurveyPage({
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
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{survey.title}</h1>
      </div>

      <SurveyStatusBar
        surveyId={survey.id}
        title={survey.title}
        status={survey.status}
        publicUrl={publicSurveyUrl(survey.slug)}
      />

      <SurveyTabs surveyId={survey.id} />

      <SurveyEditor survey={surveyToEditor(survey)} />
    </div>
  );
}
