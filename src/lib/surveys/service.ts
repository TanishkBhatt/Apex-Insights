import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  answers,
  demoDatasets,
  demoResponses,
  questions,
  responses,
  surveys,
  type Question,
  type QuestionConfig,
  type Survey,
  type SurveyStatus,
} from "@/db/schema";
import { canTransition, generateSlug } from "@/lib/surveys/lifecycle";
import type { QuestionInput, SurveyWithQuestionsInput } from "@/lib/validation/survey";

export class SurveyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SurveyServiceError";
  }
}

export type SurveySummary = Survey & {
  questionCount: number;
  realResponseCount: number;
  demoResponseCount: number;
};

export type SurveyWithQuestions = Survey & { questions: Question[] };

export type PublicSurvey = {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  questions: Array<{
    id: string;
    type: Question["type"];
    title: string;
    required: boolean;
    position: number;
    config: QuestionConfig;
  }>;
};

function normalizeConfig(input: QuestionInput): QuestionConfig {
  const config = input.config;
  switch (input.type) {
    case "single_choice":
    case "multiple_choice":
    case "dropdown":
      return { options: config.options ?? [] };
    case "linear_scale":
      return {
        min: config.min ?? 1,
        max: config.max ?? 5,
        ...(config.minLabel ? { minLabel: config.minLabel } : {}),
        ...(config.maxLabel ? { maxLabel: config.maxLabel } : {}),
      };
    case "short_text":
    case "paragraph":
      return config.placeholder ? { placeholder: config.placeholder } : {};
    default:
      return {};
  }
}

export function appBaseUrl(): string {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function publicSurveyUrl(slug: string): string {
  return `${appBaseUrl()}/survey/${slug}`;
}

/* ----------------------------- read helpers ----------------------------- */

export async function listSurveysForOwner(ownerId: string): Promise<SurveySummary[]> {
  const rows = await db
    .select({
      survey: surveys,
      questionCount: count(questions.id),
    })
    .from(surveys)
    .leftJoin(questions, eq(questions.surveyId, surveys.id))
    .where(eq(surveys.ownerId, ownerId))
    .groupBy(surveys.id)
    .orderBy(desc(surveys.updatedAt));

  const [realCounts, demoCounts] = await Promise.all([
    db
      .select({ surveyId: responses.surveyId, value: count() })
      .from(responses)
      .innerJoin(surveys, eq(surveys.id, responses.surveyId))
      .where(eq(surveys.ownerId, ownerId))
      .groupBy(responses.surveyId),
    db
      .select({ surveyId: demoDatasets.surveyId, value: count(demoResponses.id) })
      .from(demoDatasets)
      .leftJoin(demoResponses, eq(demoResponses.datasetId, demoDatasets.id))
      .where(eq(demoDatasets.ownerId, ownerId))
      .groupBy(demoDatasets.surveyId),
  ]);

  const realMap = new Map(realCounts.map((r) => [r.surveyId, Number(r.value)]));
  const demoMap = new Map(demoCounts.map((r) => [r.surveyId, Number(r.value)]));

  return rows.map((row) => ({
    ...row.survey,
    questionCount: Number(row.questionCount),
    realResponseCount: realMap.get(row.survey.id) ?? 0,
    demoResponseCount: demoMap.get(row.survey.id) ?? 0,
  }));
}

export async function getSurveyForOwner(
  ownerId: string,
  surveyId: string,
): Promise<SurveyWithQuestions | null> {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.ownerId, ownerId)))
    .limit(1);

  if (!survey) return null;

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, survey.id))
    .orderBy(questions.position);

  return { ...survey, questions: questionRows };
}

export async function getPublishedSurveyBySlug(slug: string): Promise<PublicSurvey | null> {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.slug, slug), eq(surveys.status, "published")))
    .limit(1);

  if (!survey) return null;

  const questionRows = await db
    .select({
      id: questions.id,
      type: questions.type,
      title: questions.title,
      required: questions.required,
      position: questions.position,
      config: questions.config,
    })
    .from(questions)
    .where(eq(questions.surveyId, survey.id))
    .orderBy(questions.position);

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    status: survey.status,
    questions: questionRows,
  };
}

/* ----------------------------- write helpers ---------------------------- */

async function insertQuestions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  surveyId: string,
  questionList: QuestionInput[],
): Promise<void> {
  if (questionList.length === 0) return;
  await tx.insert(questions).values(
    questionList.map((question, index) => ({
      surveyId,
      type: question.type,
      title: question.title,
      required: question.required,
      position: index,
      config: normalizeConfig(question),
    })),
  );
}

export async function createSurvey(
  ownerId: string,
  input: SurveyWithQuestionsInput,
): Promise<Survey> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = generateSlug();
    try {
      return await db.transaction(async (tx) => {
        const [survey] = await tx
          .insert(surveys)
          .values({
            ownerId,
            title: input.title,
            description: input.description,
            slug,
            status: "draft",
          })
          .returning();
        await insertQuestions(tx, survey.id, input.questions);
        return survey;
      });
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new SurveyServiceError("Could not create the survey. Please try again.");
}

async function loadAnswerUsage(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  questionIds: string[],
): Promise<{
  answerCounts: Map<string, number>;
  usedOptions: Map<string, Set<string>>;
}> {
  const answerCounts = new Map<string, number>();
  const usedOptions = new Map<string, Set<string>>();
  if (questionIds.length === 0) return { answerCounts, usedOptions };

  const counts = await tx
    .select({ questionId: answers.questionId, value: count() })
    .from(answers)
    .where(inArray(answers.questionId, questionIds))
    .groupBy(answers.questionId);
  for (const row of counts) answerCounts.set(row.questionId, Number(row.value));

  const distinctValues = await tx
    .selectDistinct({ questionId: answers.questionId, value: answers.value })
    .from(answers)
    .where(inArray(answers.questionId, questionIds));

  for (const row of distinctValues) {
    const set = usedOptions.get(row.questionId) ?? new Set<string>();
    if (typeof row.value === "string") set.add(row.value);
    else if (Array.isArray(row.value)) row.value.forEach((v) => set.add(String(v)));
    usedOptions.set(row.questionId, set);
  }

  return { answerCounts, usedOptions };
}

function assertConfigChangeAllowed(
  existing: Question,
  next: QuestionInput,
  answerCount: number,
  usedOptions: Set<string>,
): void {
  if (answerCount === 0) return;

  if (existing.type !== next.type) {
    throw new SurveyServiceError(
      `Cannot change the type of "${existing.title}" because it already has responses.`,
    );
  }

  const nextOptions = next.config.options ?? [];
  for (const option of usedOptions) {
    if (!nextOptions.includes(option)) {
      throw new SurveyServiceError(
        `Cannot remove the option "${option}" from "${existing.title}" because responses reference it.`,
      );
    }
  }

  if (existing.type === "linear_scale") {
    const existingMin = existing.config.min ?? 1;
    const existingMax = existing.config.max ?? 5;
    const nextMin = next.config.min ?? 1;
    const nextMax = next.config.max ?? 5;
    if (nextMin > existingMin || nextMax < existingMax) {
      throw new SurveyServiceError(
        `The scale of "${existing.title}" cannot be narrowed because it already has responses.`,
      );
    }
  }
}

export async function updateSurvey(
  ownerId: string,
  surveyId: string,
  input: SurveyWithQuestionsInput,
): Promise<Survey> {
  return db.transaction(async (tx) => {
    const [survey] = await tx
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.ownerId, ownerId)))
      .limit(1);
    if (!survey) throw new SurveyServiceError("Survey not found.");

    const existingQuestions = await tx
      .select()
      .from(questions)
      .where(eq(questions.surveyId, surveyId))
      .orderBy(questions.position);

    const existingById = new Map(existingQuestions.map((q) => [q.id, q]));
    const { answerCounts, usedOptions } = await loadAnswerUsage(
      tx,
      existingQuestions.map((q) => q.id),
    );

    const keptIds = new Set(
      input.questions.map((q) => q.id).filter((id): id is string => Boolean(id)),
    );

    for (const question of input.questions) {
      if (question.id && !existingById.has(question.id)) {
        throw new SurveyServiceError("A question does not belong to this survey.");
      }
    }

    const removed = existingQuestions.filter((q) => !keptIds.has(q.id));
    for (const question of removed) {
      if ((answerCounts.get(question.id) ?? 0) > 0) {
        throw new SurveyServiceError(
          `Cannot delete "${question.title}" because it already has responses.`,
        );
      }
    }
    if (removed.length > 0) {
      await tx.delete(questions).where(
        inArray(
          questions.id,
          removed.map((q) => q.id),
        ),
      );
    }

    // Two-phase position rewrite avoids unique (survey_id, position) collisions.
    if (existingQuestions.length > 0) {
      await tx
        .update(questions)
        .set({ position: sql`${questions.position} + 1000` })
        .where(eq(questions.surveyId, surveyId));
    }

    for (let index = 0; index < input.questions.length; index += 1) {
      const next = input.questions[index];
      if (next.id) {
        const existing = existingById.get(next.id);
        if (!existing) throw new SurveyServiceError("A question does not belong to this survey.");
        assertConfigChangeAllowed(
          existing,
          next,
          answerCounts.get(next.id) ?? 0,
          usedOptions.get(next.id) ?? new Set(),
        );
        await tx
          .update(questions)
          .set({
            type: next.type,
            title: next.title,
            required: next.required,
            position: index,
            config: normalizeConfig(next),
            updatedAt: new Date(),
          })
          .where(eq(questions.id, next.id));
      } else {
        await tx.insert(questions).values({
          surveyId,
          type: next.type,
          title: next.title,
          required: next.required,
          position: index,
          config: normalizeConfig(next),
        });
      }
    }

    const [updated] = await tx
      .update(surveys)
      .set({
        title: input.title,
        description: input.description,
        updatedAt: new Date(),
      })
      .where(eq(surveys.id, surveyId))
      .returning();

    return updated;
  });
}

export async function deleteSurvey(ownerId: string, surveyId: string): Promise<boolean> {
  const deleted = await db
    .delete(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.ownerId, ownerId)))
    .returning({ id: surveys.id });
  return deleted.length > 0;
}

export async function transitionSurveyStatus(
  ownerId: string,
  surveyId: string,
  nextStatus: SurveyStatus,
): Promise<Survey> {
  return db.transaction(async (tx) => {
    const [survey] = await tx
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, surveyId), eq(surveys.ownerId, ownerId)))
      .limit(1);
    if (!survey) throw new SurveyServiceError("Survey not found.");

    if (!canTransition(survey.status, nextStatus)) {
      throw new SurveyServiceError(
        `A ${survey.status} survey cannot be moved to ${nextStatus}.`,
      );
    }

    if (nextStatus === "published") {
      const [row] = await tx
        .select({ value: count() })
        .from(questions)
        .where(eq(questions.surveyId, surveyId));
      if (Number(row?.value ?? 0) === 0) {
        throw new SurveyServiceError("Add at least one question before publishing.");
      }
    }

    const [updated] = await tx
      .update(surveys)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
        publishedAt:
          nextStatus === "published" ? (survey.publishedAt ?? new Date()) : survey.publishedAt,
      })
      .where(eq(surveys.id, surveyId))
      .returning();

    return updated;
  });
}
