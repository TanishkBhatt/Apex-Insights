import { eq, and, count, inArray } from "drizzle-orm";
import { db } from "@/db";
import { demoDatasets, demoResponses, demoAnswers, questions, surveys } from "@/db/schema";
import type { Question, QuestionConfig } from "@/db/schema";
import { createPrng, pick, pickMultiple, randomInt } from "./prng";
import { SurveyServiceError } from "@/lib/surveys/service";
import { LIMITS } from "@/lib/validation/survey";

export const GENERATOR_VERSION = "v2";

export type DemoGenerationConfig = {
  count: number;
  pattern: "balanced" | "random";
};

type GeneratedValue = string | number | boolean | string[] | Record<string, string>;

type GeneratedAnswer = {
  questionId: string;
  value: GeneratedValue;
};

const FIRST_NAMES = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Elizabeth",
  "David",
  "Susan",
  "Richard",
  "Jessica",
  "Joseph",
  "Sarah",
  "Thomas",
  "Emily",
  "Daniel",
  "Emma",
  "Matthew",
  "Olivia",
  "Andrew",
  "Sophie",
  "George",
  "Alice",
  "Henry",
  "Lucy",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Miller",
  "Davis",
  "Wilson",
  "Taylor",
  "Clark",
  "Hall",
  "Wright",
  "Turner",
  "Baker",
  "Adams",
  "Green",
];

const NAME_QUESTION_PATTERN = /\bname\b/i;

/** Demo text answers: only "name" questions get a common English name; other
 *  short-text and paragraph questions stay blank on purpose. */
function generateTextAnswer(
  rand: () => number,
  question: Question,
): string {
  if (question.type === "short_text" && NAME_QUESTION_PATTERN.test(question.title)) {
    return `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`;
  }
  return "";
}

function generateNumericAnswer(
  rand: () => number,
  config: QuestionConfig,
  fallbackMin: number,
  fallbackMax: number,
): number {
  const min = config.min ?? fallbackMin;
  const max = config.max === undefined ? fallbackMax : config.max;
  if (max <= min) return min;
  const step = config.step ?? 1;
  const steps = Math.floor((max - min) / step);
  return Math.round((min + randomInt(rand, 0, Math.max(0, steps)) * step) * 1e6) / 1e6;
}

function shuffle<T>(rand: () => number, values: T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = randomInt(rand, 0, index);
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function generateAnswerForQuestion(rand: () => number, question: Question): GeneratedAnswer {
  const config = question.config as QuestionConfig;
  switch (question.type) {
    case "short_text":
    case "paragraph":
      return {
        questionId: question.id,
        value: generateTextAnswer(rand, question),
      };
    case "email": {
      const first = pick(rand, FIRST_NAMES).toLowerCase();
      const last = pick(rand, LAST_NAMES).toLowerCase();
      return {
        questionId: question.id,
        value: `${first}.${last}${randomInt(rand, 1, 999)}@example.com`,
      };
    }
    case "number":
      return {
        questionId: question.id,
        value: generateNumericAnswer(rand, config, 0, 100),
      };
    case "single_choice":
    case "dropdown": {
      const options = config.options ?? [];
      return {
        questionId: question.id,
        value: options.length > 0 ? pick(rand, options) : "",
      };
    }
    case "multiple_choice": {
      const options = config.options ?? [];
      if (options.length === 0) {
        return { questionId: question.id, value: [] };
      }
      const count = randomInt(rand, 1, Math.min(3, options.length));
      return {
        questionId: question.id,
        value: pickMultiple(rand, options, count),
      };
    }
    case "ranking": {
      return {
        questionId: question.id,
        value: shuffle(rand, config.options ?? []),
      };
    }
    case "matrix": {
      const rows = config.rows ?? [];
      const columns = config.columns ?? [];
      const value: Record<string, string> = {};
      if (columns.length > 0) {
        for (const row of rows) value[row] = pick(rand, columns);
      }
      return { questionId: question.id, value };
    }
    case "slider": {
      return {
        questionId: question.id,
        value: generateNumericAnswer(rand, config, 0, 10),
      };
    }
    case "rating":
      return {
        questionId: question.id,
        value: randomInt(rand, LIMITS.ratingMin, LIMITS.ratingMax),
      };
    case "nps":
      return {
        questionId: question.id,
        value: randomInt(rand, LIMITS.npsMin, LIMITS.npsMax),
      };
    case "linear_scale": {
      const min = config.min ?? 1;
      const max = config.max ?? 5;
      return {
        questionId: question.id,
        value: randomInt(rand, min, max),
      };
    }
    case "yes_no":
      return {
        questionId: question.id,
        value: rand() < 0.5,
      };
    default:
      return {
        questionId: question.id,
        value: "",
      };
  }
}

export async function generateSyntheticDataset(
  ownerId: string,
  surveyId: string,
  seed: string,
  count: number,
) {
  if (count < LIMITS.demoResponsesMin || count > LIMITS.demoResponsesMax) {
    throw new SurveyServiceError(
      `Demo response count must be between ${LIMITS.demoResponsesMin} and ${LIMITS.demoResponsesMax}.`,
    );
  }

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

  return db.transaction(async (tx) => {
    // Delete existing dataset for this survey (owner-scoped) to regenerate cleanly.
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
        config: { count, pattern: "balanced" },
      })
      .returning();

    for (let i = 0; i < count; i += 1) {
      const rand = createPrng(`${seed}:${i}`);
      const [response] = await tx
        .insert(demoResponses)
        .values({
          datasetId: dataset.id,
          seedIndex: i,
        })
        .returning({ id: demoResponses.id });

      const answers: Array<{
        demoResponseId: string;
        questionId: string;
        value: GeneratedValue;
      }> = [];
      for (const question of questionRows) {
        const gen = generateAnswerForQuestion(rand, question);
        answers.push({
          demoResponseId: response.id,
          questionId: gen.questionId,
          value: gen.value,
        });
      }
      if (answers.length > 0) {
        await tx.insert(demoAnswers).values(answers);
      }
    }

    return dataset;
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
    .select({ id: demoResponses.id, seedIndex: demoResponses.seedIndex, submittedAt: demoResponses.submittedAt })
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
