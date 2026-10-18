import type { QuestionType } from "@/lib/validation/survey";

export type AnalyticsAnswerValue = string | number | boolean | string[] | null;

export type AnalyticsRow = {
  submittedAt: Date;
  answers: Array<{
    questionId: string;
    type: QuestionType | string;
    value: AnalyticsAnswerValue;
  }>;
};

export type DistributionPoint = {
  label: string;
  count: number;
  percentage: number;
};

export type TextStats = {
  kind: "text";
  answered: number;
  unanswered: number;
  topWords: Array<{ word: string; count: number }>;
  recentAnswers: string[];
};

export type ChoiceStats = {
  kind: "choice";
  answered: number;
  unanswered: number;
  points: DistributionPoint[];
};

export type ScaleStats = {
  kind: "scale";
  answered: number;
  unanswered: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  points: DistributionPoint[];
};

export type BooleanStats = {
  kind: "boolean";
  answered: number;
  unanswered: number;
  points: DistributionPoint[];
};

export type QuestionStats =
  | TextStats
  | ChoiceStats
  | ScaleStats
  | BooleanStats;

export type TimelinePoint = { date: string; count: number };

export type AnalyticsSummary = {
  totalResponses: number;
  answeredByQuestion: Array<{ questionId: string; answered: number; percentage: number }>;
  timeline: TimelinePoint[];
};

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "her", "was",
  "one", "our", "out", "his", "has", "had", "how", "its", "let", "may", "new", "now",
  "old", "see", "two", "way", "who", "did", "get", "got", "him", "him", "she", "too",
  "this", "that", "with", "have", "from", "they", "been", "said", "each", "which",
  "their", "will", "other", "about", "out", "them", "then", "these", "some", "would",
  "make", "like", "into", "just", "over", "also", "very", "more", "what", "when",
  "were", "there", "your", "should", "could", "than", "only", "because", "were",
]);

export function tokenizeText(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^['-]+|['-]+$/g, ""))
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

function percentage(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function isAnswered(value: AnalyticsAnswerValue): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function distribution(counts: Map<string, number>, total: number): DistributionPoint[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count, percentage: percentage(count, total) }));
}

function median(sortedNumbers: number[]): number | null {
  if (sortedNumbers.length === 0) return null;
  const mid = Math.floor(sortedNumbers.length / 2);
  if (sortedNumbers.length % 2 === 1) return sortedNumbers[mid];
  return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
}

export function computeQuestionStats(
  type: QuestionType | string,
  values: Array<AnalyticsAnswerValue>,
): QuestionStats {
  const answeredValues = values.filter(isAnswered);
  const answered = answeredValues.length;
  const unanswered = values.length - answered;

  switch (type) {
    case "short_text":
    case "paragraph": {
      const wordCounts = new Map<string, number>();
      for (const value of answeredValues) {
        for (const word of tokenizeText(String(value))) {
          wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
        }
      }
      const topWords = [...wordCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
      const recentAnswers = answeredValues
        .slice(-5)
        .map((value) => String(value));
      return { kind: "text", answered, unanswered, topWords, recentAnswers };
    }

    case "single_choice":
    case "dropdown": {
      const counts = new Map<string, number>();
      for (const value of answeredValues) {
        const key = String(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return { kind: "choice", answered, unanswered, points: distribution(counts, answered) };
    }

    case "multiple_choice": {
      const counts = new Map<string, number>();
      for (const value of answeredValues) {
        const selections = Array.isArray(value) ? value : [value];
        for (const selection of selections) {
          const key = String(selection);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      return { kind: "choice", answered, unanswered, points: distribution(counts, answered) };
    }

    case "linear_scale": {
      const numbers = answeredValues
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      const counts = new Map<string, number>();
      for (const value of numbers) {
        const key = String(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const sorted = [...numbers].sort((a, b) => a - b);
      const sum = numbers.reduce((total, value) => total + value, 0);
      return {
        kind: "scale",
        answered: numbers.length,
        unanswered: values.length - numbers.length,
        mean: numbers.length ? Math.round((sum / numbers.length) * 100) / 100 : null,
        median: median(sorted),
        min: sorted[0] ?? null,
        max: sorted[sorted.length - 1] ?? null,
        points: distribution(counts, numbers.length).sort(
          (a, b) => Number(a.label) - Number(b.label),
        ),
      };
    }

    case "yes_no": {
      const counts = new Map<string, number>();
      for (const value of answeredValues) {
        const key = value === true || value === "true" ? "Yes" : "No";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return { kind: "boolean", answered, unanswered, points: distribution(counts, answered) };
    }

    default:
      return { kind: "text", answered, unanswered, topWords: [], recentAnswers: [] };
  }
}

export function computeTimeline(rows: AnalyticsRow[]): TimelinePoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = row.submittedAt instanceof Date ? row.submittedAt : new Date(row.submittedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}

export function computeAnalytics(
  questions: Array<{ id: string; type: QuestionType | string }>,
  rows: AnalyticsRow[],
) {
  const perQuestion = questions.map((question) => {
    const values = rows.map(
      (row) => row.answers.find((answer) => answer.questionId === question.id)?.value ?? null,
    );
    return { questionId: question.id, stats: computeQuestionStats(question.type, values) };
  });

  const answeredByQuestion = perQuestion.map(({ questionId, stats }) => ({
    questionId,
    answered: stats.answered,
    percentage: percentage(stats.answered, rows.length),
  }));

  return {
    summary: {
      totalResponses: rows.length,
      answeredByQuestion,
      timeline: computeTimeline(rows),
    } satisfies AnalyticsSummary,
    perQuestion,
  };
}
