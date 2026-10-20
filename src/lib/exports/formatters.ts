import type { Question } from "@/db/schema";
import type { AnalyticsAnswerValue, AnalyticsRow } from "@/lib/analytics/compute";

export function formatAnswerValue(type: string, value: AnalyticsAnswerValue): string {
  if (value === null || value === undefined) return "";
  if (type === "yes_no") return value === true || value === "true" ? "Yes" : "No";
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([row, column]) => `${row}: ${column}`)
      .join("; ");
  }
  return String(value);
}

/** Safe folder name used inside the ZIP and as the ZIP's display name. */
export function exportFolderName(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 80);
  return `${cleaned || "Survey"} - ApexInsights`;
}

export function zipFilename(title: string): string {
  return `${exportFolderName(title)}.zip`;
}

/** RFC 5987-safe Content-Disposition value with an ASCII fallback. */
export function attachmentDisposition(filename: string): string {
  const ascii = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename)
    .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}


function escapeCsvField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Build an RFC 4180-style CSV: one column per question, one row per response,
 * plus a leading submitted-at column and trailing source column.
 */
export function buildResponsesCsv(
  questions: Question[],
  rows: AnalyticsRow[],
  source: string,
): string {
  const header = ["Submitted at", ...questions.map((q) => q.title), "Source"];
  const lines = [header.map(escapeCsvField).join(",")];

  for (const row of rows) {
    const answerByQuestion = new Map(row.answers.map((a) => [a.questionId, a]));
    const cells = [
      row.submittedAt instanceof Date
        ? row.submittedAt.toISOString()
        : new Date(row.submittedAt).toISOString(),
      ...questions.map((question) => {
        const answer = answerByQuestion.get(question.id);
        return formatAnswerValue(String(question.type), answer?.value ?? null);
      }),
      source,
    ];
    lines.push(cells.map(escapeCsvField).join(","));
  }

  return `${lines.join("\r\n")}\r\n`;
}

export type ExportJsonPayload = {
  survey: { id: string; title: string; description: string | null; status: string };
  source: string;
  generatedAt: string;
  questionCount: number;
  responseCount: number;
  questions: Array<{
    id: string;
    title: string;
    type: string;
    position: number;
    required: boolean;
  }>;
  responses: Array<{
    submittedAt: string;
    answers: Array<{ questionId: string; value: AnalyticsAnswerValue }>;
  }>;
};

export function buildResponsesJson(
  survey: ExportJsonPayload["survey"],
  questions: Question[],
  rows: AnalyticsRow[],
  source: string,
): ExportJsonPayload {
  return {
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
    },
    source,
    generatedAt: new Date().toISOString(),
    questionCount: questions.length,
    responseCount: rows.length,
    questions: questions.map((question) => ({
      id: question.id,
      title: question.title,
      type: String(question.type),
      position: question.position,
      required: question.required,
    })),
    responses: rows.map((row) => ({
      submittedAt:
        row.submittedAt instanceof Date
          ? row.submittedAt.toISOString()
          : new Date(row.submittedAt).toISOString(),
      answers: row.answers.map((answer) => ({
        questionId: answer.questionId,
        value: answer.value,
      })),
    })),
  };
}

/** Build a safe download filename from the survey title, data source and extension. */
export function contentDispositionFilename(
  title: string,
  source: string,
  extension: string,
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "survey"}-${source}.${extension}`;
}
