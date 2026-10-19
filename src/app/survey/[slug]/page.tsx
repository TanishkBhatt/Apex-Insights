import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, CheckCircle2 } from "lucide-react";
import { PublicSurveyForm } from "@/components/public/public-survey-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardBody } from "@/components/ui/card";
import { getPublishedSurveyBySlug } from "@/lib/surveys/service";

export const metadata = { title: "Survey" };

export default async function PublicSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const isThankYou = search.thankyou === "1";

  const survey = await getPublishedSurveyBySlug(slug);

  if (!survey) notFound();

  if (isThankYou) {
    return (
      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full">
          <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Thank you</h1>
              <p className="mt-1 text-sm text-slate-600">Your response has been submitted successfully.</p>
            </div>
            <p className="text-xs text-slate-500">You may close this window.</p>
          </CardBody>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 text-slate-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BarChart3 className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Apex Insights</span>
        </Link>
        <ThemeToggle />
      </header>

      <Card>
        <CardBody className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-semibold text-slate-900">{survey.title}</h1>
            {survey.description ? (
              <p className="mt-2 text-sm text-slate-600">{survey.description}</p>
            ) : null}
          </div>
          <PublicSurveyForm
            slug={slug}
            survey={{
              id: survey.id,
              title: survey.title,
              description: survey.description,
              questions: survey.questions.map((question) => ({
                id: question.id,
                type: question.type,
                title: question.title,
                required: question.required,
                config: question.config,
              })),
            }}
          />
        </CardBody>
      </Card>

      <footer className="mt-6 text-center text-xs text-slate-500">
        Survey Made Easy · Apex Insights
      </footer>
    </main>
  );
}
