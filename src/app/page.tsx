import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileDown,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

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
    icon: FileDown,
    title: "CSV, JSON & PDF",
    description:
      "Export the dataset you are analysing — including a shareable PDF analytics report.",
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
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold">Apex Insights</span>
          </Link>
          <nav className="flex items-center gap-2">
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
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Survey Made Easy
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Create surveys and see the results before anyone responds.
              </h1>
              <p className="mt-5 text-lg text-slate-600">
                Apex Insights is a survey platform for students, school projects and research.
                Design your questionnaire, publish a public link, and generate a clearly-labelled
                synthetic dataset to preview your analytics immediately.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
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
              <ul className="mt-8 space-y-2 text-sm text-slate-600">
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

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <p className="text-sm font-medium text-slate-700">
                  Course feedback survey · Analytics preview
                </p>
              </div>
              <CardBody className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    How would you rate the workshop?
                  </p>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Excellent", value: 42 },
                      { label: "Good", value: 33 },
                      { label: "Average", value: 18 },
                      { label: "Poor", value: 7 },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs text-slate-500">{row.label}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${row.value}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-600">
                          {row.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Synthetic demo data — generated for testing and preview purposes. These
                  responses are not real survey results.
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold text-slate-900">Everything you need</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              A focused toolkit for survey creation, response collection and readable analytics —
              without unnecessary complexity.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title}>
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

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
          Apex Insights — Survey Made Easy
        </div>
      </footer>
    </div>
  );
}
