import Link from "next/link";
import { ArrowRight, BarChart3, Database, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/surveys/survey-status-bar";
import { listSurveysForOwner } from "@/lib/surveys/service";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const surveys = await listSurveysForOwner(user.id);

  const totalReal = surveys.reduce((sum, survey) => sum + survey.realResponseCount, 0);
  const demoDatasets = surveys.filter((survey) => survey.demoResponseCount > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your surveys</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {user.name}. Everything here is private to your account.
          </p>
        </div>
        <Link href="/dashboard/surveys/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            New survey
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Surveys", value: surveys.length, icon: FileText },
          { label: "Real responses", value: totalReal, icon: BarChart3 },
          { label: "Demo datasets", value: demoDatasets, icon: Database },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardBody className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<FileText className="h-6 w-6" aria-hidden />}
              title="No surveys yet"
              description="Create your first survey, add questions and publish a public link to start collecting responses."
              action={
                <Link href="/dashboard/surveys/new">
                  <Button>
                    <Plus className="h-4 w-4" aria-hidden />
                    Create a survey
                  </Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-3">
          {surveys.map((survey) => (
            <li key={survey.id}>
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/surveys/${survey.id}/edit`}
                        className="truncate font-medium text-slate-900 hover:text-indigo-700"
                      >
                        {survey.title}
                      </Link>
                      <StatusBadge status={survey.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {survey.questionCount} question{survey.questionCount === 1 ? "" : "s"} ·{" "}
                      {survey.realResponseCount} real response
                      {survey.realResponseCount === 1 ? "" : "s"} ·{" "}
                      {survey.demoResponseCount} demo response
                      {survey.demoResponseCount === 1 ? "" : "s"} · updated{" "}
                      {formatDateTime(survey.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/surveys/${survey.id}/analytics`}
                      className="rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Analytics
                    </Link>
                    <Link
                      href={`/dashboard/surveys/${survey.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
