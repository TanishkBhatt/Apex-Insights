import type { QuestionConfig } from "@/db/schema";
import type { QuestionType } from "@/lib/validation/survey";

export type AnalyticsAnswerValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, string>
  | null;

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

export type NumberStats = {
  kind: "number";
  answered: number;
  unanswered: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  points: DistributionPoint[];
};

export type NpsStats = {
  kind: "nps";
  answered: number;
  unanswered: number;
  score: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  points: DistributionPoint[];
};

export type EmailStats = {
  kind: "email";
  answered: number;
  unanswered: number;
  unique: number;
  domains: DistributionPoint[];
  recentAnswers: string[];
};

export type RankingItem = {
  label: string;
  averageRank: number | null;
  firstPlace: number;
  count: number;
};

export type RankingStats = {
  kind: "ranking";
  answered: number;
  unanswered: number;
  items: RankingItem[];
};

export type MatrixRowStats = {
  label: string;
  answered: number;
  points: DistributionPoint[];
};

export type MatrixStats = {
  kind: "matrix";
  answered: number;
  unanswered: number;
  rows: MatrixRowStats[];
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
  | NumberStats
  | NpsStats
  | EmailStats
  | RankingStats
  | MatrixStats
  | BooleanStats;

export type TimelinePoint = { date: string; count: number };

export type AnalyticsSummary = {
  totalResponses: number;
  answeredByQuestion: Array<{ questionId: string; answered: number; percentage: number }>;
  timeline: TimelinePoint[];
};

export type AnalyticsRange = "7" | "30" | "90" | "all";

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
  if (typeof value === "object") return Object.keys(value).length > 0;
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

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(round(value, 2));
}

function numericSummary(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((total, value) => total + value, 0);
  return {
    mean: numbers.length ? round(sum / numbers.length) : null,
    median: median(sorted) === null ? null : round(median(sorted) as number),
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
  };
}

function numberHistogram(numbers: number[]): DistributionPoint[] {
  if (numbers.length === 0) return [];
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  if (min === max) {
    return [{ label: formatNumber(min), count: numbers.length, percentage: 100 }];
  }

  const counts = new Map<string, number>();
  const allIntegers = numbers.every((value) => Number.isInteger(value));
  if (allIntegers && max - min <= 10) {
    for (let value = min; value <= max; value += 1) counts.set(String(value), 0);
    for (const value of numbers) counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
    return [...counts.entries()].map(([label, count]) => ({
      label,
      count,
      percentage: percentage(count, numbers.length),
    }));
  }

  const binCount = 10;
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const low = min + index * width;
    const high = min + (index + 1) * width;
    return {
      low,
      high,
      label: `${formatNumber(low)}–${formatNumber(high)}`,
      count: 0,
    };
  });
  for (const value of numbers) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) / width)));
    bins[index].count += 1;
  }
  return bins.map((bin) => ({
    label: bin.label,
    count: bin.count,
    percentage: percentage(bin.count, numbers.length),
  }));
}

function scaleStats(numbers: number[], totalValues: number): ScaleStats {
  const summary = numericSummary(numbers);
  const counts = new Map<string, number>();
  for (const value of numbers) {
    const key = formatNumber(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return {
    kind: "scale",
    answered: numbers.length,
    unanswered: totalValues - numbers.length,
    ...summary,
    points: distribution(counts, numbers.length).sort(
      (a, b) => Number(a.label) - Number(b.label),
    ),
  };
}

export function computeQuestionStats(
  type: QuestionType | string,
  values: Array<AnalyticsAnswerValue>,
  config: QuestionConfig = {},
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
      const recentAnswers = answeredValues.slice(-5).map((value) => String(value));
      return { kind: "text", answered, unanswered, topWords, recentAnswers };
    }

    case "email": {
      const emails = answeredValues.map((value) => String(value).toLowerCase());
      const unique = new Set(emails).size;
      const counts = new Map<string, number>();
      for (const email of emails) {
        const domain = email.split("@").pop() || "(unknown)";
        counts.set(domain, (counts.get(domain) ?? 0) + 1);
      }
      return {
        kind: "email",
        answered,
        unanswered,
        unique,
        domains: distribution(counts, emails.length),
        recentAnswers: answeredValues.slice(-5).map((value) => String(value)),
      };
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

    case "slider":
    case "rating":
    case "linear_scale": {
      const numbers = answeredValues
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      return scaleStats(numbers, values.length);
    }

    case "number": {
      const numbers = answeredValues
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      return {
        kind: "number",
        answered: numbers.length,
        unanswered: values.length - numbers.length,
        ...numericSummary(numbers),
        points: numberHistogram(numbers),
      };
    }

    case "nps": {
      const numbers = answeredValues
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 10);
      let promoters = 0;
      let passives = 0;
      let detractors = 0;
      const counts = new Map<string, number>();
      for (let score = 0; score <= 10; score += 1) counts.set(String(score), 0);
      for (const score of numbers) {
        counts.set(String(score), (counts.get(String(score)) ?? 0) + 1);
        if (score >= 9) promoters += 1;
        else if (score >= 7) passives += 1;
        else detractors += 1;
      }
      return {
        kind: "nps",
        answered: numbers.length,
        unanswered: values.length - numbers.length,
        score:
          numbers.length > 0
            ? round(((promoters - detractors) / numbers.length) * 100, 1)
            : null,
        promoters,
        passives,
        detractors,
        points: [...counts.entries()].map(([label, count]) => ({
          label,
          count,
          percentage: percentage(count, numbers.length),
        })),
      };
    }

    case "ranking": {
      const options = config.options ?? [];
      const rankSum = new Map<string, number>();
      const appearances = new Map<string, number>();
      const firstPlace = new Map<string, number>();
      for (const value of answeredValues) {
        if (!Array.isArray(value)) continue;
        value.forEach((label, index) => {
          rankSum.set(label, (rankSum.get(label) ?? 0) + index + 1);
          appearances.set(label, (appearances.get(label) ?? 0) + 1);
          if (index === 0) firstPlace.set(label, (firstPlace.get(label) ?? 0) + 1);
        });
      }
      const labels = options.length > 0 ? options : [...rankSum.keys()];
      const items: RankingItem[] = labels.map((label) => {
        const count = appearances.get(label) ?? 0;
        return {
          label,
          averageRank: count ? round((rankSum.get(label) ?? 0) / count) : null,
          firstPlace: firstPlace.get(label) ?? 0,
          count,
        };
      });
      items.sort((a, b) => {
        if (a.averageRank === null) return 1;
        if (b.averageRank === null) return -1;
        return a.averageRank - b.averageRank || a.label.localeCompare(b.label);
      });
      return { kind: "ranking", answered, unanswered, items };
    }

    case "matrix": {
      const rows = config.rows ?? [];
      const columns = config.columns ?? [];
      const rowLabels =
        rows.length > 0
          ? rows
          : [
              ...new Set(
                answeredValues.flatMap((value) =>
                  value && typeof value === "object" && !Array.isArray(value)
                    ? Object.keys(value)
                    : [],
                ),
              ),
            ];
      const columnLabels =
        columns.length > 0
          ? columns
          : [
              ...new Set(
                answeredValues.flatMap((value) =>
                  value && typeof value === "object" && !Array.isArray(value)
                    ? Object.values(value)
                    : [],
                ),
              ),
            ];
      const perRow = rowLabels.map((label) => {
        const counts = new Map<string, number>(columnLabels.map((column) => [column, 0]));
        let rowAnswered = 0;
        for (const value of answeredValues) {
          if (!value || typeof value !== "object" || Array.isArray(value)) continue;
          const column = value[label];
          if (typeof column !== "string" || !columnLabels.includes(column)) continue;
          counts.set(column, (counts.get(column) ?? 0) + 1);
          rowAnswered += 1;
        }
        return {
          label,
          answered: rowAnswered,
          points: columnLabels.map((column) => ({
            label: column,
            count: counts.get(column) ?? 0,
            percentage: percentage(counts.get(column) ?? 0, rowAnswered),
          })),
        };
      });
      return { kind: "matrix", answered, unanswered, rows: perRow };
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

export function daysForRange(range: AnalyticsRange): number | null {
  switch (range) {
    case "7":
      return 7;
    case "30":
      return 30;
    case "90":
      return 90;
    default:
      return null;
  }
}

export function filterRowsByRange(
  rows: AnalyticsRow[],
  range: AnalyticsRange,
  now: Date = new Date(),
): AnalyticsRow[] {
  const days = daysForRange(range);
  if (days === null) return rows;
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    const date = row.submittedAt instanceof Date ? row.submittedAt : new Date(row.submittedAt);
    return !Number.isNaN(date.getTime()) && date.getTime() >= since;
  });
}

export function computeAnalytics(
  questions: Array<{ id: string; type: QuestionType | string; config?: QuestionConfig }>,
  rows: AnalyticsRow[],
) {
  const perQuestion = questions.map((question) => {
    const values = rows.map(
      (row) => row.answers.find((answer) => answer.questionId === question.id)?.value ?? null,
    );
    return {
      questionId: question.id,
      stats: computeQuestionStats(question.type, values, question.config),
    };
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
