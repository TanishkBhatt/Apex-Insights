import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, surveys } from "@/db/schema";
import type { Question } from "@/db/schema";
import { listResponsesForOwner } from "@/lib/responses/service";
import { getDemoResponseRowsForOwner } from "@/lib/synthetic/generator";
import { computeTimeline, type AnalyticsRow, type TimelinePoint } from "./compute";

export type AnalyticsSource = "real" | "demo" | "both";

export type AnalyticsLoadResult = {
  survey: { id: string; title: string; description: string | null; status: string };
  questions: Question[];
  rows: AnalyticsRow[];
  sources: {
    real: number;
    demo: number;
  };
  timeline: TimelinePoint[];
};

export async function loadAnalytics(
  ownerId: string,
  surveyId: string,
  source: AnalyticsSource,
): Promise<AnalyticsLoadResult | null> {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.ownerId, ownerId)))
    .limit(1);
  if (!survey) return null;

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(questions.position);

  let realCount = 0;
  let demoCount = 0;
  const rows: AnalyticsRow[] = [];
  const realRows: AnalyticsRow[] = [];

  if (source === "real" || source === "both") {
    const result = await listResponsesForOwner(ownerId, surveyId, 5000);
    realCount = result?.total ?? 0;
    for (const response of result?.responses ?? []) {
      const normalized: AnalyticsRow = {
        submittedAt: response.submittedAt,
        answers: response.answers.map((answer) => ({
          questionId: answer.questionId,
          type: answer.type,
          value: answer.value as AnalyticsRow["answers"][number]["value"],
        })),
      };
      rows.push(normalized);
      realRows.push(normalized);
    }
  }

  if (source === "demo" || source === "both") {
    const result = await getDemoResponseRowsForOwner(ownerId, surveyId, 5000);
    demoCount = result?.total ?? 0;
    for (const response of result?.responses ?? []) {
      rows.push({
        submittedAt: response.submittedAt,
        answers: response.answers.map((answer) => ({
          questionId: answer.questionId,
          type: answer.type,
          value: answer.value as AnalyticsRow["answers"][number]["value"],
        })),
      });
    }
  }

  // Demo rows share a generation timestamp, so a combined timeline is misleading.
  // Build the timeline from real submissions only.
  return {
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
    },
    questions: questionRows,
    rows,
    sources: { real: realCount, demo: demoCount },
    timeline: computeTimeline(realRows),
  };
}
