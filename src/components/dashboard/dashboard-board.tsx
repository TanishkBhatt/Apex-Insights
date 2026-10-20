"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  CopyPlus,
  Database,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { duplicateSurveyAction } from "@/app/dashboard/surveys/actions";
import { DashboardActivityChart } from "@/components/dashboard/activity-chart";
import { ShareSurveyButton } from "@/components/surveys/share-survey-dialog";
import { StatusBadge } from "@/components/surveys/survey-status-bar";
import { Alert, Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  activityTotal,
  percentageChange,
  type DashboardActivity,
  type DailyActivityPoint,
} from "@/lib/dashboard/activity-shared";
import {
  STATUS_FILTERS,
  SORT_OPTIONS,
  filterSurveys,
  sortSurveys,
  type DashboardSort,
  type DashboardStatusFilter,
  type DashboardSurvey,
} from "@/lib/dashboard/filter";
import { cn, formatDateTime } from "@/lib/utils";

const VIEW_KEY = "apex-insights:dashboard-view";
const ONBOARDING_KEY = "apex-insights:onboarding-dismissed";

type ViewMode = "grid" | "list";

function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function Sparkline({
  points,
  tone,
}: {
  points: DailyActivityPoint[];
  tone: string;
}) {
  const width = 104;
  const height = 32;
  const max = Math.max(1, ...points.map((point) => point.count));
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - 3 - (point.count / max) * (height - 6);
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-24"
      role="img"
      aria-label="Activity over the last 14 days"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={tone}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  series,
  tone,
  detail,
  trend,
}: {
  label: string;
  value: number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconClass: string;
  series: DailyActivityPoint[];
  tone: string;
  detail: string;
  trend?: number | null;
}) {
  const displayed = useCountUp(value);

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {label}
            </p>
            <p className="mt-1 text-3xl font-semibold text-slate-900 tabular-nums">
              {displayed}
            </p>
          </div>
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              iconClass,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500">{detail}</p>
            {trend !== undefined ? (
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                  trend === null
                    ? "text-indigo-600"
                    : trend > 0
                      ? "text-emerald-600"
                      : trend < 0
                        ? "text-red-600"
                        : "text-slate-500",
                )}
              >
                {trend === null ? (
                  <>
                    <Sparkles className="h-3 w-3" aria-hidden />
                    New this period
                  </>
                ) : trend > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3" aria-hidden />
                    {trend}% vs previous
                  </>
                ) : trend < 0 ? (
                  <>
                    <TrendingDown className="h-3 w-3" aria-hidden />
                    {Math.abs(trend)}% vs previous
                  </>
                ) : (
                  "Same as previous period"
                )}
              </p>
            ) : null}
          </div>
          <Sparkline points={series} tone={tone} />
        </div>
      </CardBody>
    </Card>
  );
}

function CopyLinkButton({ publicUrl }: { publicUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copy() {
    setError(false);
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={copy}
      title={error ? "Could not copy the link" : "Copy public link"}
      aria-label={copied ? "Link copied" : "Copy public link"}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}

function SurveyCard({
  survey,
  view,
  onDuplicate,
  duplicating,
}: {
  survey: DashboardSurvey;
  view: ViewMode;
  onDuplicate: (surveyId: string) => void;
  duplicating: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border border-slate-200 bg-surface p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md",
        view === "grid" ? "flex h-full flex-col" : "flex flex-wrap items-center gap-4",
      )}
    >
      <div className={cn("min-w-0 flex-1", view === "grid" && "space-y-3")}>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/surveys/${survey.id}/edit`}
            className={cn(
              "truncate font-medium text-slate-900 hover:text-indigo-700",
              view === "grid" ? "text-base" : "text-sm",
            )}
          >
            {survey.title}
          </Link>
          <StatusBadge status={survey.status} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {survey.questionCount} question{survey.questionCount === 1 ? "" : "s"} ·{" "}
          {survey.realResponseCount} real · {survey.demoResponseCount} demo · updated{" "}
          {formatDateTime(survey.updatedAt)}
        </p>
        {view === "grid" && survey.questionCount === 0 ? (
          <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
            Add questions before publishing this survey.
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          view === "grid" && "mt-4 border-t border-slate-100 pt-3",
        )}
      >
        <Link
          href={`/dashboard/surveys/${survey.id}/edit`}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href={`/dashboard/surveys/${survey.id}/analytics`}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <BarChart3 className="h-4 w-4" aria-hidden />
          Analytics
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDuplicate(survey.id)}
          disabled={duplicating}
          title="Duplicate survey"
          aria-label={`Duplicate ${survey.title}`}
        >
          {duplicating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CopyPlus className="h-4 w-4" aria-hidden />
          )}
        </Button>
        {survey.status === "published" ? (
          <>
            <CopyLinkButton publicUrl={survey.publicUrl} />
            <ShareSurveyButton publicUrl={survey.publicUrl} title={survey.title} />
          </>
        ) : (
          <Link
            href={`/dashboard/surveys/${survey.id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            Share when published
          </Link>
        )}
      </div>
    </article>
  );
}

function Onboarding({
  surveys,
  totalReal,
}: {
  surveys: DashboardSurvey[];
  totalReal: number;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDismissed(localStorage.getItem(ONBOARDING_KEY) === "1");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const steps = [
    {
      label: "Create your first survey",
      done: surveys.length > 0,
      href: "/dashboard/surveys/new",
    },
    {
      label: "Add questions to a survey",
      done: surveys.some((survey) => survey.questionCount > 0),
      href: surveys[0] ? `/dashboard/surveys/${surveys[0].id}/edit` : "/dashboard/surveys/new",
    },
    {
      label: "Publish a survey",
      done: surveys.some((survey) => survey.status !== "draft"),
      href: surveys[0] ? `/dashboard/surveys/${surveys[0].id}/edit` : "/dashboard/surveys/new",
    },
    {
      label: "Collect your first real response",
      done: totalReal > 0,
      href: surveys.find((survey) => survey.status === "published")
        ? `/dashboard/surveys/${
            surveys.find((survey) => survey.status === "published")!.id
          }/analytics`
        : "/dashboard",
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  if (completed === steps.length || dismissed) return null;

  return (
    <Card className="overflow-hidden border-indigo-200!">
      <CardBody className="space-y-3 bg-indigo-50/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
              Getting started
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {completed} of {steps.length} steps complete
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-28 overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={completed}
              aria-label="Onboarding progress"
            >
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${(completed / steps.length) * 100}%` }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.setItem(ONBOARDING_KEY, "1");
                setDismissed(true);
              }}
              aria-label="Dismiss getting started"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.label}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-sm",
                  step.done
                    ? "border-emerald-200 text-slate-500"
                    : "border-slate-200 text-slate-700 hover:border-indigo-300",
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                )}
                <span className={cn("min-w-0 flex-1", step.done && "line-through")}>
                  {step.label}
                </span>
                {!step.done ? (
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export function DashboardBoard({
  userName,
  surveys,
  activity,
}: {
  userName: string;
  surveys: DashboardSurvey[];
  activity: DashboardActivity;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DashboardStatusFilter>("all");
  const [sort, setSort] = useState<DashboardSort>("updated");
  const [view, setView] = useState<ViewMode>("grid");
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = localStorage.getItem(VIEW_KEY);
      if (stored === "grid" || stored === "list") setView(stored);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function changeView(next: ViewMode) {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  const totalReal = surveys.reduce((sum, survey) => sum + survey.realResponseCount, 0);
  const totalDemo = surveys.filter((survey) => survey.demoResponseCount > 0).length;
  const filtered = useMemo(
    () => sortSurveys(filterSurveys(surveys, { query, status }), sort),
    [surveys, query, status, sort],
  );
  const statusCounts = useMemo(
    () => ({
      all: surveys.length,
      draft: surveys.filter((survey) => survey.status === "draft").length,
      published: surveys.filter((survey) => survey.status === "published").length,
      closed: surveys.filter((survey) => survey.status === "closed").length,
    }),
    [surveys],
  );
  const trend = percentageChange(activity.realRecent, activity.realPrevious);
  const hasFilters = query.trim().length > 0 || status !== "all";

  async function duplicate(surveyId: string) {
    setActionError(null);
    setDuplicatingId(surveyId);
    try {
      const result = await duplicateSurveyAction(surveyId);
      if (result.ok && result.surveyId) {
        router.push(`/dashboard/surveys/${result.surveyId}/edit`);
        router.refresh();
      } else if (!result.ok) {
        setActionError(result.error);
      }
    } finally {
      setDuplicatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your surveys</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {userName}. Everything here is private to your account.
          </p>
        </div>
        <Link href="/dashboard/surveys/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            New survey
          </Button>
        </Link>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Surveys"
          value={surveys.length}
          icon={FileText}
          iconClass="bg-indigo-50 text-indigo-600"
          series={activity.surveysSeries}
          tone="#6366f1"
          detail={`${activity.surveysRecent} new in ${activity.days} days`}
        />
        <StatCard
          label="Real responses"
          value={totalReal}
          icon={BarChart3}
          iconClass="bg-emerald-50 text-emerald-600"
          series={activity.realSeries}
          tone="#059669"
          detail={`${activity.realRecent} in the last ${activity.days} days`}
          trend={trend}
        />
        <StatCard
          label="Demo datasets"
          value={totalDemo}
          icon={Database}
          iconClass="bg-violet-50 text-violet-600"
          series={activity.demoSeries}
          tone="#7c3aed"
          detail={`${activity.demoRecent} new in ${activity.days} days`}
        />
      </div>

      <Card>
        <CardHeader
          title={`Responses in the last ${activity.days} days`}
          description={`${activityTotal(activity.timeline)} real response${
            activityTotal(activity.timeline) === 1 ? "" : "s"
          } across all surveys.`}
          actions={
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Live data
            </Link>
          }
        />
        <CardBody>
          <DashboardActivityChart points={activity.timeline} />
        </CardBody>
      </Card>

      <Onboarding surveys={surveys} totalReal={totalReal} />

      {surveys.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<FileText className="h-6 w-6" aria-hidden />}
              title="No surveys yet"
              description="Create your first survey, add questions and publish a public link to start collecting responses."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/dashboard/surveys/new">
                    <Button>
                      <Plus className="h-4 w-4" aria-hidden />
                      Create a survey
                    </Button>
                  </Link>
                  <Link href="/dashboard/surveys/new">
                    <Button variant="outline">Browse templates</Button>
                  </Link>
                </div>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search surveys by title or slug…"
                aria-label="Search surveys"
                aria-keyshortcuts="/"
                className="w-full rounded-lg border border-slate-300 bg-surface py-2 pr-16 pl-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
              />
              <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                /
              </kbd>
            </div>

            <div
              className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
              role="group"
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map((option) => {
                const active = option.value === status;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-sm font-medium transition",
                      active
                        ? "bg-surface text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {option.label}
                    <span className="ml-1 text-xs text-slate-400">
                      {statusCounts[option.value]}
                    </span>
                  </button>
                );
              })}
            </div>

            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as DashboardSort)}
              aria-label="Sort surveys"
              className="w-auto min-w-44"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <div
              className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
              role="group"
              aria-label="Layout"
            >
              <button
                type="button"
                aria-pressed={view === "grid"}
                aria-label="Grid view"
                onClick={() => changeView("grid")}
                className={cn(
                  "rounded-md p-1.5 transition",
                  view === "grid"
                    ? "bg-surface text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-pressed={view === "list"}
                aria-label="List view"
                onClick={() => changeView("list")}
                className={cn(
                  "rounded-md p-1.5 transition",
                  view === "list"
                    ? "bg-surface text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                <List className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500" aria-live="polite">
              {filtered.length} of {surveys.length} survey
              {surveys.length === 1 ? "" : "s"}
              {hasFilters ? " match your filters" : ""}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
              >
                <X className="h-3 w-3" aria-hidden />
                Clear filters
              </button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  title="No matching surveys"
                  description="Try a different search term or status filter."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setStatus("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <div
              className={cn(
                view === "grid"
                  ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                  : "space-y-3",
              )}
            >
              {filtered.map((survey) => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  view={view}
                  onDuplicate={duplicate}
                  duplicating={duplicatingId === survey.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
