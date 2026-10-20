import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  GraduationCap,
  HeartPulse,
  LayoutTemplate,
  Users,
} from "lucide-react";
import { SURVEY_TEMPLATES } from "@/lib/surveys/templates";
import { cn } from "@/lib/utils";

const templateIcons = {
  "student-wellbeing": HeartPulse,
  "course-feedback": GraduationCap,
  "event-rsvp": CalendarCheck,
  "employee-pulse": Users,
} as const;

export function TemplatePicker({ selectedId }: { selectedId?: string }) {
  return (
    <section aria-labelledby="template-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="template-heading"
            className="flex items-center gap-2 text-sm font-semibold text-slate-900"
          >
            <LayoutTemplate className="h-4 w-4 text-indigo-600" aria-hidden />
            Start from a template
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Pick a ready-made survey, then tailor the questions before publishing.
          </p>
        </div>
        <Link
          href="/dashboard/surveys/new"
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium",
            selectedId
              ? "text-indigo-600 hover:bg-indigo-50"
              : "bg-indigo-50 text-indigo-700",
          )}
        >
          Start from scratch
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SURVEY_TEMPLATES.map((template) => {
          const Icon =
            templateIcons[template.id as keyof typeof templateIcons] ??
            LayoutTemplate;
          const selected = template.id === selectedId;
          return (
            <Link
              key={template.id}
              href={`/dashboard/surveys/new?template=${template.id}`}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "group flex flex-col rounded-xl border bg-surface p-4 transition hover:border-indigo-300 hover:shadow-sm",
                selected
                  ? "border-indigo-500 ring-1 ring-indigo-500"
                  : "border-slate-200",
              )}
            >
              <span className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                  {template.tag}
                </span>
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-900">
                {template.name}
              </span>
              <span className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
                {template.description}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                {selected ? "Selected" : "Use template"}
                <ArrowRight
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
