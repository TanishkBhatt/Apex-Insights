import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SurveyEditor } from "@/components/surveys/survey-editor";
import { TemplatePicker } from "@/components/surveys/template-picker";
import { getSurveyTemplate } from "@/lib/surveys/templates";
import { requireUser } from "@/lib/session";

export const metadata = { title: "New survey" };

export default async function NewSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  await requireUser();
  const { template: templateId } = await searchParams;
  const template = getSurveyTemplate(templateId);

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
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create a survey</h1>
        <p className="mt-1 text-sm text-slate-500">
          {template
            ? `Starting from “${template.name}”. Everything can be edited before you publish.`
            : "Add your questions now — you can keep editing after saving and publish when ready."}
        </p>
      </div>

      <TemplatePicker selectedId={template?.id} />

      <SurveyEditor key={template?.id ?? "blank"} initial={template?.draft} />
    </div>
  );
}
