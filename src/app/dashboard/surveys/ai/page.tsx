import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AiSurveyBuilder } from "@/components/surveys/ai-survey-builder";
import { requireUser } from "@/lib/session";

export const metadata = { title: "AI survey builder" };
export const maxDuration = 60;

export default async function AiSurveyPage() {
  await requireUser();

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
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Sparkles className="h-6 w-6 text-indigo-600" aria-hidden />
          AI survey builder
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Describe your goal and Gemini will draft a complete survey. Refine it
          conversationally, then save it as a private draft and edit every detail before
          publishing.
        </p>
      </div>

      <AiSurveyBuilder />
    </div>
  );
}
