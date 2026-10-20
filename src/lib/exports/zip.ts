import JSZip from "jszip";
import type { Question } from "@/db/schema";
import type { AnalyticsRow } from "@/lib/analytics/compute";
import {
  buildResponsesCsv,
  buildResponsesJson,
  exportFolderName,
} from "@/lib/exports/formatters";

export type SurveyExportZipInput = {
  survey: {
    id: string;
    title: string;
    description: string | null;
    status: string;
  };
  questions: Question[];
  rows: AnalyticsRow[];
  source: string;
};

export async function buildSurveyExportZip(
  input: SurveyExportZipInput,
): Promise<{ bytes: Uint8Array; folderName: string }> {
  const zip = new JSZip();
  const folderName = exportFolderName(input.survey.title);
  const folder = zip.folder(folderName);
  if (!folder) throw new Error("Could not prepare the export.");

  folder.file("responses.csv", buildResponsesCsv(input.questions, input.rows, input.source));
  folder.file(
    "responses.json",
    JSON.stringify(
      buildResponsesJson(input.survey, input.questions, input.rows, input.source),
      null,
      2,
    ),
  );

  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { bytes, folderName };
}
