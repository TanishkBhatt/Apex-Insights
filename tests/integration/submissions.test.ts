import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { withDbRetry } from "@/lib/db-retry";
import { questions, responses, user } from "@/db/schema";
import {
  createSurvey,
  deleteSurvey,
  transitionSurveyStatus,
} from "@/lib/surveys/service";
import {
  getResponseForOwner,
  submitPublicResponse,
} from "@/lib/responses/service";
import type {
  SurveyWithQuestionsInput,
} from "@/lib/validation/survey";

const ownerId = `test-submit-owner-${randomUUID()}`;

function baseInput(
  overrides: Partial<SurveyWithQuestionsInput> = {},
): SurveyWithQuestionsInput {
  return {
    title: "Submission test survey",
    description: null,
    thankYouMessage: null,
    closesAt: null,
    maxResponses: null,
    questions: [
      {
        type: "short_text",
        title: "Your name",
        required: true,
        config: {},
      },
    ],
    ...overrides,
  };
}

async function createPublished(input: SurveyWithQuestionsInput) {
  const survey = await createSurvey(ownerId, input);
  await transitionSurveyStatus(ownerId, survey.id, "published");
  return survey;
}

beforeAll(async () => {
  await withDbRetry(() =>
    db.insert(user).values({
      id: ownerId,
      name: "Submission Owner",
      email: `${ownerId}@example.test`,
      emailVerified: false,
    }),
  );
});

afterAll(async () => {
  await withDbRetry(() => db.delete(user).where(eq(user.id, ownerId)));
});

describe("public submissions", () => {
  it("stores validated answers for every supported shape", async () => {
    const survey = await createPublished(
      baseInput({
        questions: [
          {
            type: "short_text",
            title: "Your name",
            required: true,
            config: {},
          },
          {
            type: "email",
            title: "Email",
            required: true,
            config: {},
          },
          {
            type: "slider",
            title: "Score",
            required: true,
            config: { min: 0, max: 10, step: 1 },
          },
          {
            type: "multiple_choice",
            title: "Topics",
            required: false,
            config: { options: ["A", "B"], allowOther: true },
          },
          {
            type: "ranking",
            title: "Rank",
            required: true,
            config: { options: ["X", "Y", "Z"] },
          },
          {
            type: "matrix",
            title: "Rate",
            required: true,
            config: { rows: ["Speed", "Price"], columns: ["Poor", "Good"] },
          },
        ],
      }),
    );
    const questionRows = await db
      .select({ id: questions.id, title: questions.title })
      .from(questions)
      .where(eq(questions.surveyId, survey.id));
    const byTitle = new Map(
      questionRows.map((question) => [question.title, question.id]),
    );

    const responseId = await submitPublicResponse(
      {
        answers: [
          { questionId: byTitle.get("Your name"), value: "  Ada Lovelace  " },
          { questionId: byTitle.get("Email"), value: "ada@example.com" },
          { questionId: byTitle.get("Score"), value: 7 },
          {
            questionId: byTitle.get("Topics"),
            value: ["A", "Other: Accessibility"],
          },
          {
            questionId: byTitle.get("Rank"),
            value: ["Y", "X", "Z"],
          },
          {
            questionId: byTitle.get("Rate"),
            value: { Speed: "Good", Price: "Poor" },
          },
        ],
      },
      survey.slug,
    );

    const saved = await getResponseForOwner(ownerId, survey.id, responseId);
    expect(saved).not.toBeNull();
    const values = new Map(
      saved!.answers.map((answer) => [answer.questionTitle, answer.value]),
    );
    expect(values.get("Your name")).toBe("Ada Lovelace");
    expect(values.get("Email")).toBe("ada@example.com");
    expect(values.get("Score")).toBe(7);
    expect(values.get("Topics")).toEqual(["A", "Other: Accessibility"]);
    expect(values.get("Rank")).toEqual(["Y", "X", "Z"]);
    expect(values.get("Rate")).toEqual({ Speed: "Good", Price: "Poor" });

    await deleteSurvey(ownerId, survey.id);
  });

  it("rejects responses after the close date", async () => {
    const survey = await createPublished(
      baseInput({ closesAt: new Date(Date.now() - 60_000) }),
    );
    const [questionRow] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.surveyId, survey.id));

    await expect(
      submitPublicResponse(
        {
          answers: [{ questionId: questionRow.id, value: "Too late" }],
        },
        survey.slug,
      ),
    ).rejects.toMatchObject({ status: 403 });

    await deleteSurvey(ownerId, survey.id);
  });

  it("enforces the response limit without a race", async () => {
    const survey = await createPublished(baseInput({ maxResponses: 1 }));
    const [questionRow] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.surveyId, survey.id));
    const payload = {
      answers: [{ questionId: questionRow.id, value: "Only once" }],
    };

    const results = await Promise.allSettled([
      submitPublicResponse(payload, survey.slug),
      submitPublicResponse(payload, survey.slug),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const [row] = await db
      .select({ value: count() })
      .from(responses)
      .where(eq(responses.surveyId, survey.id));
    expect(Number(row.value)).toBe(1);

    await deleteSurvey(ownerId, survey.id);
  });
});
