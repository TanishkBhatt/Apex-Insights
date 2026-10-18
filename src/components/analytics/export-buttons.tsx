import { Download, FileJson, FileText, Table } from "lucide-react";
import type { AnalyticsSource } from "@/lib/analytics/load";
import type { ComponentType, SVGProps } from "react";

const FORMATS: Array<{
  format: "csv" | "json" | "pdf";
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  { format: "csv", label: "CSV", icon: Table },
  { format: "json", label: "JSON", icon: FileJson },
  { format: "pdf", label: "PDF", icon: FileText },
];

export function ExportButtons({
  surveyId,
  source,
}: {
  surveyId: string;
  source: AnalyticsSource;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Download className="h-3.5 w-3.5" aria-hidden />
        Export
      </span>
      {FORMATS.map(({ format, label, icon: Icon }) => (
        <a
          key={format}
          href={`/api/surveys/${surveyId}/export?format=${format}&source=${source}`}
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </a>
      ))}
    </div>
  );
}
