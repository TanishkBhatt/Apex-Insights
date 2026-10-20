import { Download } from "lucide-react";
import type { AnalyticsSource } from "@/lib/analytics/load";

export function ExportButtons({
  surveyId,
  source,
}: {
  surveyId: string;
  source: AnalyticsSource;
}) {
  return (
    <a
      href={`/api/surveys/${surveyId}/export?format=zip&source=${source}`}
      download
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      title="Download a ZIP with responses.csv and responses.json"
    >
      <Download className="h-4 w-4" aria-hidden />
      Export
      <span className="text-xs font-normal text-slate-500">.zip</span>
    </a>
  );
}
