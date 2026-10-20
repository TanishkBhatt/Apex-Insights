import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { SurveyTabs } from "@/components/surveys/survey-tabs";
import { ExportButtons } from "@/components/analytics/export-buttons";
import { Alert, Card, CardBody, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAnswerValue } from "@/lib/exports/formatters";
import { listResponsesForOwner } from "@/lib/responses/service";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

function pageHref(id: string, page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/dashboard/surveys/${id}/responses${search ? `?${search}` : ""}`;
}

export default async function ResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { q: rawQuery, page: rawPage } = await searchParams;
  const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 200) : "";
  const requestedPage = Number.parseInt(
    typeof rawPage === "string" ? rawPage : "1",
    10,
  );
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const result = await listResponsesForOwner(user.id, id, PAGE_SIZE, {
    offset: (page - 1) * PAGE_SIZE,
    search: query,
  });

  if (!result) notFound();

  const { responses, total } = result;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

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
            {query ? ` matching “${query}”` : ""}
          </p>
        </div>
        <ExportButtons surveyId={id} source="real" />
      </div>

      <SurveyTabs surveyId={id} />

      <form
        action={`/dashboard/surveys/${id}/responses`}
        method="get"
        className="flex flex-wrap items-center gap-2"
        role="search"
      >
        <div className="relative min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search answer text…"
            aria-label="Search responses"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {query ? (
          <Link
            href={`/dashboard/surveys/${id}/responses`}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </Link>
        ) : null}
      </form>

      {responses.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title={query ? "No matching responses" : "No real responses yet"}
              description={
                query
                  ? "Try a different word or clear the search to see every response."
                  : "Share your public link to start collecting genuine responses. Demo data is managed separately."
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <Alert tone="info">
            Showing {firstShown}–{lastShown} of {total} responses. Open a row for the
            full submission, or export the complete dataset.
          </Alert>
          <Card>
            <CardBody className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-3 text-left font-medium text-slate-700">
                      Submitted at
                    </th>
                    {responses[0].answers.map((answer) => (
                      <th
                        key={answer.questionId}
                        className="px-2 py-2 text-left font-medium text-slate-700"
                      >
                        {answer.questionTitle}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => (
                    <tr
                      key={response.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        <Link
                          href={`/dashboard/surveys/${id}/responses/${response.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {formatDateTime(response.submittedAt)}
                        </Link>
                      </td>
                      {response.answers.map((answer) => {
                        const formatted = formatAnswerValue(answer.type, answer.value);
                        return (
                          <td
                            key={answer.questionId}
                            className="max-w-56 truncate px-2 py-2 text-xs text-slate-600"
                            title={formatted || "No answer"}
                          >
                            {formatted || <span className="text-slate-400">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {totalPages > 1 ? (
            <nav
              className="flex flex-wrap items-center justify-between gap-3"
              aria-label="Response pages"
            >
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={pageHref(id, page - 1, query)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-400">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Previous
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={pageHref(id, page + 1, query)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-400">
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </div>
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}
