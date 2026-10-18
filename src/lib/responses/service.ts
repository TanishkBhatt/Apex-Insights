import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  answers,
  questions,
  responses,
  surveys,
  type AnswerValue,
  type Question,
} from "@/db/schema";
import { validateAnswer } from "@/lib/validation/answers";
import { LIMITS } from "@/lib/validation/survey";

export class SubmissionError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SubmissionError";
    this.status = status;
  }
}

export const submissionSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            questionId: z.string().uuid("Invalid question reference."),
            value: z.unknown(),
          })
          .strict(),
      )
      .max(LIMITS.cpuAnswersMax, "Too many answers in one submission."),
  })
  .strict();

export type SubmissionPayload = z.infer<typeof submissionSchema>;

/**
 * Validate and persist a public response. Never trusts client-supplied survey
 * or owner identifiers: the survey is resolved from its public slug and must be
 * published.
 */
export async function submitPublicResponse(payload: unknown, slug: string): Promise<string> {
  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new SubmissionError("The submission is malformed.");
  }

  const [survey] = await db
    .select({ id: surveys.id, status: surveys.status })
    .from(surveys)
    .where(eq(surveys.slug, slug))
    .limit(1);

  if (!survey) throw new SubmissionError("Survey not found.", 404);
  if (survey.status !== "published") {
    throw new SubmissionError("This survey is not accepting responses.", 403);
  }

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, survey.id))
    .orderBy(asc(questions.position));

  const byId = new Map(questionRows.map((question) => [question.id, question]));
  const provided = new Map<string, unknown>();

  for (const answer of parsed.data.answers) {
    const question = byId.get(answer.questionId);
    if (!question) {
      throw new SubmissionError("The submission references an unknown question.");
    }
    if (provided.has(answer.questionId)) {
      throw new SubmissionError("Duplicate answers for the same question.");
    }
    provided.set(answer.questionId, answer.value);
  }

  const validated: Array<{ questionId: string; value: AnswerValue }> = [];
  for (const question of questionRows) {
    const raw = provided.get(question.id);
    const result = validateAnswer(
      {
        id: question.id,
        type: question.type,
        required: question.required,
        config: question.config,
      },
      raw,
    );
    if (!result.ok) {
      throw new SubmissionError(result.error);
    }
    if (result.answered) {
      validated.push({ questionId: question.id, value: result.value });
    }
  }

  const responseId = await db.transaction(async (tx) => {
    const [response] = await tx
      .insert(responses)
      .values({ surveyId: survey.id })
      .returning({ id: responses.id });

    if (validated.length > 0) {
      await tx.insert(answers).values(
        validated.map((answer) => ({
          responseId: response.id,
          questionId: answer.questionId,
          value: answer.value,
        })),
      );
    }

    return response.id;
  });

  return responseId;
}

/* ---------------------- owner-facing response views --------------------- */

export type ResponseAnswerView = {
  questionId: string;
  questionTitle: string;
  type: Question["type"];
  value: AnswerValue | null;
};

export type ResponseView = {
  id: string;
  submittedAt: Date;
  answers: ResponseAnswerView[];
};

export async function listResponsesForOwner(
  ownerId: string,
  surveyId: string,
  limit = 200,
): Promise<{ responses: ResponseView[]; total: number } | null> {
  const [survey] = await db
    .select({ id: surveys.id })
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.ownerId, ownerId)))
    .limit(1);

  if (!survey) return null;

  const [totalRow] = await db
    .select({ value: count() })
    .from(responses)
    .where(eq(responses.surveyId, surveyId));

  const questionRows = await db
    .select({
      id: questions.id,
      title: questions.title,
      type: questions.type,
      position: questions.position,
    })
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(asc(questions.position));

  const responseRows = await db
    .select({ id: responses.id, submittedAt: responses.submittedAt })
    .from(responses)
    .where(eq(responses.surveyId, surveyId))
    .orderBy(desc(responses.submittedAt))
    .limit(limit);

  if (responseRows.length === 0) {
    return { responses: [], total: Number(totalRow?.value ?? 0) };
  }

  const answerRows = await db
    .select({
      responseId: answers.responseId,
      questionId: answers.questionId,
      value: answers.value,
    })
    .from(answers)
    .where(
      inArray(
        answers.responseId,
        responseRows.map((row) => row.id),
      ),
    );

  const answerMap = new Map<string, Map<string, AnswerValue>>();
  for (const row of answerRows) {
    const perResponse = answerMap.get(row.responseId) ?? new Map<string, AnswerValue>();
    perResponse.set(row.questionId, row.value);
    answerMap.set(row.responseId, perResponse);
  }

  return {
    total: Number(totalRow?.value ?? 0),
    responses: responseRows.map((row) => {
      const perResponse = answerMap.get(row.id) ?? new Map<string, AnswerValue>();
      return {
        id: row.id,
        submittedAt: row.submittedAt,
        answers: questionRows.map((question) => ({
          questionId: question.id,
          questionTitle: question.title,
          type: question.type,
          value: perResponse.get(question.id) ?? null,
        })),
      };
    }),
  };
}

export async function countRealResponsesForOwner(
  ownerId: string,
  surveyId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ value: count() })
    .from(responses)
    .innerJoin(surveys, eq(surveys.id, responses.surveyId))
    .where(and(eq(surveys.id, surveyId), eq(surveys.ownerId, ownerId)));
  if (!row) return null;
  return Number(row.value);
}
