"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { segment: "edit", label: "Build" },
  { segment: "preview", label: "Preview" },
  { segment: "responses", label: "Responses" },
  { segment: "analytics", label: "Analytics" },
  { segment: "demo-data", label: "Demo data" },
];

export function SurveyTabs({ surveyId }: { surveyId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((tab) => {
        const href = `/dashboard/surveys/${surveyId}/${tab.segment}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              active
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
