import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { InteractiveAnalyticsPreview } from "@/components/landing/interactive-analytics-preview";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: ListChecks,
    title: "Build any survey",
    description:
      "Short text, paragraph, single and multiple choice, dropdown, linear scale and yes/no questions.",
  },
  {
    icon: Sparkles,
    title: "Synthetic demo data",
    description:
      "Preview realistic analytics instantly with a deterministic, seed-based demo dataset. Clearly labelled, never mixed with real results.",
  },
  {
    icon: BarChart3,
    title: "Clear analytics",
    description:
      "Per-question charts and percentages with explicit denominators, for real responses or your demo dataset.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV & JSON exports",
    description:
      "Download the dataset you are analysing as CSV for spreadsheets or JSON for your own tools.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    description:
      "Owner-only access to surveys, responses, demo datasets and exports, enforced on the server.",
  },
  {
    icon: Database,
    title: "Real persistence",
    description:
      "Surveys, questions, responses and demo data stored in PostgreSQL with foreign keys and constraints.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold">Apex Insights</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative isolate overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-blob absolute -top-24 -left-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
            <div
              className="animate-blob absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl"
              style={{ animationDelay: "-7s" }}
            />
            <div
              className="animate-blob absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
              style={{ animationDelay: "-12s" }}
            />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Survey Made Easy
                </span>
                <h1 className="animate-fade-up mt-4 text-4xl font-semibold tracking-tight text-slate-900 [animation-delay:60ms] sm:text-5xl">
                  Create surveys and see the results before anyone responds.
                </h1>
                <p className="animate-fade-up mt-5 text-lg text-slate-600 [animation-delay:120ms]">
                  Apex Insights is a survey platform for students, school projects and research.
                  Design your questionnaire, publish a public link, and generate a clearly-labelled
                  synthetic dataset to preview your analytics immediately.
                </p>
                <div className="animate-fade-up mt-8 flex flex-wrap gap-3 [animation-delay:180ms]">
                  <Link href="/signup">
                    <Button size="lg">
                      Start for free
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">
                      I already have an account
                    </Button>
                  </Link>
                </div>
                <ul className="animate-fade-up mt-8 space-y-2 text-sm text-slate-600 [animation-delay:240ms]">
                  {[
                    "Unlimited surveys per account",
                    "Public survey links, no respondent sign-up",
                    "Separate real and synthetic datasets",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <InteractiveAnalyticsPreview />
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold text-slate-900">Everything you need</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              A focused toolkit for survey creation, response collection and readable analytics —
              without unnecessary complexity.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }, index) => (
                <Card
                  key={title}
                  className="animate-fade-up transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <CardBody className="space-y-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-600">{description}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
          Apex Insights — Survey Made Easy
        </div>
      </footer>
    </div>
  );
}
