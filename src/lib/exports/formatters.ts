import type { Question } from "@/db/schema";
import type { AnalyticsAnswerValue, AnalyticsRow, QuestionStats } from "@/lib/analytics/compute";

export function formatAnswerValue(type: string, value: AnalyticsAnswerValue): string {
  if (value === null || value === undefined) return "";
  if (type === "yes_no") return value === true || value === "true" ? "Yes" : "No";
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
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

/** pdf-lib's standard fonts are WinAnsi-only; replace characters they cannot encode. */
export function toPdfSafeText(input: string): string {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

export function summarizeStatsForPdf(
  stats: QuestionStats,
): string[] {
  switch (stats.kind) {
    case "choice":
    case "boolean":
      return stats.points.map((point) => `${point.label}: ${point.count} (${point.percentage}%)`);
    case "scale":
      return [
        `Mean: ${stats.mean ?? "n/a"} · Median: ${stats.median ?? "n/a"} · Range: ${stats.min ?? "n/a"}-${stats.max ?? "n/a"}`,
        ...stats.points.map((point) => `${point.label}: ${point.count} (${point.percentage}%)`),
      ];
    case "text":
      return [
        `Answered: ${stats.answered} · Skipped: ${stats.unanswered}`,
        stats.topWords.length
          ? `Top words: ${stats.topWords.map((w) => `${w.word} (${w.count})`).join(", ")}`
          : "Not enough text to analyse.",
      ];
    default:
      return [];
  }
}
