import { randomUUID } from "node:crypto";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { demoAnswers, demoDatasets, demoResponses, questions, surveys } from "@/db/schema";
import type { AnswerValue } from "@/lib/validation/answers";
import { validateAnswer } from "@/lib/validation/answers";
import { LIMITS } from "@/lib/validation/survey";
import type { GeneratedDemoResponse } from "@/lib/ai/demo";
import { generateDemoResponses } from "@/lib/ai/demo";
import { SurveyServiceError } from "@/lib/surveys/service";

export const GENERATOR_VERSION = "ai-v1";

export type DemoDatasetPersistenceInput = {
  count: number;
  responses: GeneratedDemoResponse[];
  context?: string;
  model?: string;
  seed?: string;
};

function assertDemoCount(count: number): void {
  if (count < LIMITS.demoResponsesMin || count > LIMITS.demoAiResponsesMax) {
    throw new SurveyServiceError(
      `Demo response count must be between ${LIMITS.demoResponsesMin} and ${LIMITS.demoAiResponsesMax}.`,
    );
  }
}

async function loadSurveyAndQuestions(ownerId: string, surveyId: string) {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.ownerId, ownerId)))
    .limit(1);
  if (!survey) throw new SurveyServiceError("Survey not found.");

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(questions.position);

  if (questionRows.length === 0) {
    throw new SurveyServiceError("Add at least one question before generating demo data.");
  }

  return { survey, questions: questionRows };
}

function validateGeneratedResponses(
  questionRows: Awaited<ReturnType<typeof loadSurveyAndQuestions>>["questions"],
  input: DemoDatasetPersistenceInput,
): GeneratedDemoResponse[] {
  assertDemoCount(input.count);
  if (input.responses.length !== input.count) {
    throw new SurveyServiceError(
      `Expected ${input.count} generated responses but received ${input.responses.length}.`,
    );
  }

  const byId = new Map(questionRows.map((question) => [question.id, question]));
  return input.responses.map((response, index) => {
    const seen = new Set<string>();
    const answers = response.answers.map((answer) => {
      const question = byId.get(answer.questionId);
      if (!question) {
        throw new SurveyServiceError(
          `Generated response ${index + 1} references an unknown question.`,
        );
      }
      if (seen.has(answer.questionId)) {
        throw new SurveyServiceError(
          `Generated response ${index + 1} contains a duplicate question answer.`,
        );
      }
      seen.add(answer.questionId);

      const result = validateAnswer(question, answer.value);
      if (!result.ok) {
        throw new SurveyServiceError(
          `Generated answer for "${question.title}" is invalid: ${result.error}`,
        );
      }
      if (!result.answered) {
        throw new SurveyServiceError(
          `Generated answer for "${question.title}" is blank.`,
        );
      }
      return {
        questionId: answer.questionId,
        value: result.value as AnswerValue,
      };
    });

    return { answers };
  });
}

/**
 * Persist a generated demo dataset, replacing any existing dataset for this
 * survey. Validation happens before the destructive write, and real responses
 * live in separate tables so they can never be affected.
 */
export async function replaceDemoDataset(
  ownerId: string,
  surveyId: string,
  input: DemoDatasetPersistenceInput,
) {
  const { questions: questionRows } = await loadSurveyAndQuestions(ownerId, surveyId);
  const responses = validateGeneratedResponses(questionRows, input);
  const seed = input.seed ?? `ai-${randomUUID()}`;

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: demoDatasets.id })
      .from(demoDatasets)
      .where(and(eq(demoDatasets.surveyId, surveyId), eq(demoDatasets.ownerId, ownerId)))
      .limit(1);
    if (existing) {
      await tx.delete(demoDatasets).where(eq(demoDatasets.id, existing.id));
    }

    const [dataset] = await tx
      .insert(demoDatasets)
      .values({
        surveyId,
        ownerId,
        seed,
        generatorVersion: GENERATOR_VERSION,
        config: {
          count: input.count,
          pattern: "gemini",
          ...(input.model ? { model: input.model } : {}),
          ...(input.context ? { context: input.context } : {}),
        },
      })
      .returning();

    const responseRows = await tx
      .insert(demoResponses)
      .values(
        responses.map((_, index) => ({
          datasetId: dataset.id,
          seedIndex: index,
        })),
      )
      .returning({ id: demoResponses.id, seedIndex: demoResponses.seedIndex });

    const responseByIndex = new Map(
      responseRows.map((row) => [row.seedIndex, row.id]),
    );
    const answerRows: Array<{
      demoResponseId: string;
      questionId: string;
      value: AnswerValue;
    }> = [];

    responses.forEach((response, index) => {
      const responseId = responseByIndex.get(index);
      if (!responseId) return;
      for (const answer of response.answers) {
        answerRows.push({
          demoResponseId: responseId,
          questionId: answer.questionId,
          value: answer.value,
        });
      }
    });

    for (let index = 0; index < answerRows.length; index += 1000) {
      await tx.insert(demoAnswers).values(answerRows.slice(index, index + 1000));
    }

    return dataset;
  });
}

export async function generateSyntheticDataset(
  ownerId: string,
  surveyId: string,
  input: { count: number; context?: string },
) {
  assertDemoCount(input.count);
  const { survey, questions: questionRows } = await loadSurveyAndQuestions(
    ownerId,
    surveyId,
  );

  const generated = await generateDemoResponses({
    surveyTitle: survey.title,
    surveyDescription: survey.description,
    context: input.context,
    questions: questionRows,
    count: input.count,
  });

  return replaceDemoDataset(ownerId, surveyId, {
    count: input.count,
    responses: generated.responses,
    context: input.context,
    model: generated.model,
  });
}

export async function deleteDemoDatasetForOwner(ownerId: string, surveyId: string) {
  const [dataset] = await db
    .select({ id: demoDatasets.id })
    .from(demoDatasets)
    .where(and(eq(demoDatasets.surveyId, surveyId), eq(demoDatasets.ownerId, ownerId)))
    .limit(1);
  if (!dataset) return false;
  await db.delete(demoDatasets).where(eq(demoDatasets.id, dataset.id));
  return true;
}

export async function getDemoDatasetForOwner(ownerId: string, surveyId: string) {
  const [dataset] = await db
    .select()
    .from(demoDatasets)
    .where(and(eq(demoDatasets.surveyId, surveyId), eq(demoDatasets.ownerId, ownerId)))
    .limit(1);
  if (!dataset) return null;

  const [row] = await db
    .select({ total: count() })
    .from(demoResponses)
    .where(eq(demoResponses.datasetId, dataset.id));
  return {
    ...dataset,
    responseCount: Number(row?.total ?? 0),
  };
}

export async function getDemoResponseRowsForOwner(
  ownerId: string,
  surveyId: string,
  limit = 50,
) {
  const dataset = await getDemoDatasetForOwner(ownerId, surveyId);
  if (!dataset) return null;

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(questions.position);

  const responseRows = await db
    .select({
      id: demoResponses.id,
      seedIndex: demoResponses.seedIndex,
      submittedAt: demoResponses.submittedAt,
    })
    .from(demoResponses)
    .where(eq(demoResponses.datasetId, dataset.id))
    .orderBy(demoResponses.seedIndex)
    .limit(limit);

  if (responseRows.length === 0) return { dataset, responses: [], total: dataset.responseCount };

  const answerRows = await db
    .select({
      demoResponseId: demoAnswers.demoResponseId,
      questionId: demoAnswers.questionId,
      value: demoAnswers.value,
    })
    .from(demoAnswers)
    .where(inArray(demoAnswers.demoResponseId, responseRows.map((r) => r.id)));

  const answerMap = new Map<string, Map<string, unknown>>();
  for (const row of answerRows) {
    const per = answerMap.get(row.demoResponseId) ?? new Map();
    per.set(row.questionId, row.value);
    answerMap.set(row.demoResponseId, per);
  }

  return {
    dataset,
    total: dataset.responseCount,
    responses: responseRows.map((r) => ({
      id: r.id,
      seedIndex: r.seedIndex,
      submittedAt: r.submittedAt,
      answers: questionRows.map((q) => ({
        questionId: q.id,
        questionTitle: q.title,
        type: q.type,
        value: answerMap.get(r.id)?.get(q.id) ?? null,
      })),
    })),
  };
}
