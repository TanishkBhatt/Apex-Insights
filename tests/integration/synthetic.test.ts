import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { withDbRetry } from "@/lib/db-retry";
import { demoDatasets, questions, surveys, user } from "@/db/schema";
import type { Question } from "@/db/schema";
import { createSurvey, transitionSurveyStatus } from "@/lib/surveys/service";
import {
  deleteDemoDatasetForOwner,
  getDemoDatasetForOwner,
  getDemoResponseRowsForOwner,
  replaceDemoDataset,
  type DemoDatasetPersistenceInput,
} from "@/lib/synthetic/generator";
import { listResponsesForOwner } from "@/lib/responses/service";
import type { SurveyWithQuestionsInput } from "@/lib/validation/survey";

const ownerId = `test-demo-owner-${randomUUID()}`;

const input: SurveyWithQuestionsInput = {
  title: "Demo generator survey",
  description: "Temporary",
  thankYouMessage: null,
  closesAt: null,
  maxResponses: null,
  questions: [
    {
      type: "dropdown",
      title: "Favourite subject?",
      required: true,
      config: { options: ["Maths", "Science", "Art"] },
    },
    {
      type: "paragraph",
      title: "Comments?",
      required: false,
      config: {},
    },
    {
      type: "slider",
      title: "How happy are you?",
      required: true,
      config: { min: 1, max: 5, step: 1, minLabel: "Low", maxLabel: "High" },
    },
    { type: "yes_no", title: "Would recommend?", required: false, config: {} },
    { type: "short_text", title: "What is your full name?", required: false, config: {} },
    { type: "short_text", title: "Describe your day", required: false, config: {} },
  ],
};

let surveyId: string;
let questionRows: Question[];

function answerFor(question: Question, index: number) {
  switch (question.type) {
    case "dropdown":
    case "single_choice":
      return question.config.options?.[index % (question.config.options.length || 1)] ?? "";
    case "multiple_choice":
      return (question.config.options ?? []).slice(0, 2);
    case "ranking":
      return question.config.options ?? [];
    case "matrix":
      return Object.fromEntries(
        (question.config.rows ?? []).map((row) => [
          row,
          question.config.columns?.[index % (question.config.columns?.length || 1)] ?? "",
        ]),
      );
    case "paragraph":
      return "The lessons were clear and the pace felt manageable.";
    case "slider":
      return question.config.min ?? 1;
    case "number":
      return question.config.min ?? 12;
    case "rating":
      return 4;
    case "nps":
      return 8;
    case "email":
      return `respondent${index + 1}@example.com`;
    case "yes_no":
      return index % 2 === 0;
    case "linear_scale":
      return 3;
    case "short_text":
      return /name/i.test(question.title) ? `Alex Smith ${index + 1}` : "A varied day.";
    default:
      return "";
  }
}

function makeResponses(
  count: number,
): DemoDatasetPersistenceInput["responses"] {
  return Array.from({ length: count }, (_, index) => ({
    answers: questionRows.map((question) => ({
      questionId: question.id,
      value: answerFor(question, index),
    })),
  }));
}

function persist(count: number, overrides: Partial<DemoDatasetPersistenceInput> = {}) {
  return replaceDemoDataset(ownerId, surveyId, {
    count,
    responses: makeResponses(count),
    model: "test-model",
    ...overrides,
  });
}

beforeAll(async () => {
  await withDbRetry(() =>
    db.insert(user).values({
      id: ownerId,
      name: "Demo Owner",
      email: `${ownerId}@example.test`,
      emailVerified: false,
    }),
  );
  const survey = await createSurvey(ownerId, input);
  await transitionSurveyStatus(ownerId, survey.id, "published");
  surveyId = survey.id;
  questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(questions.position);
});

afterAll(async () => {
  await withDbRetry(() => db.delete(user).where(eq(user.id, ownerId)));
});

describe("demo dataset persistence", () => {
  it("persists the requested number of demo responses", async () => {
    const dataset = await persist(12, { seed: "test-seed" });
    expect(dataset).toBeTruthy();

    const loaded = await getDemoDatasetForOwner(ownerId, surveyId);
    expect(loaded?.responseCount).toBe(12);
    expect(loaded?.seed).toBe("test-seed");
    expect(loaded?.config.model).toBe("test-model");
  });

  it("produces every answer type without errors", async () => {
    await persist(8);
    const rows = await getDemoResponseRowsForOwner(ownerId, surveyId, 8);
    expect(rows?.responses).toHaveLength(8);

    for (const response of rows!.responses) {
      expect(response.answers).toHaveLength(6);
      const [dropdown, paragraph, scale, yesNo, nameText, otherText] = response.answers;
      expect(["Maths", "Science", "Art"]).toContain(dropdown.value);
      expect(typeof paragraph.value).toBe("string");
      expect(typeof scale.value).toBe("number");
      expect(scale.value).toBeGreaterThanOrEqual(1);
      expect(scale.value).toBeLessThanOrEqual(5);
      expect(typeof yesNo.value).toBe("boolean");
      expect(nameText.value).toMatch(/^Alex Smith \d+$/);
      expect(otherText.value).toBe("A varied day.");
    }
  });

  it("replaces the previous dataset instead of appending", async () => {
    await persist(5, { seed: "first-run" });
    await persist(7, { seed: "second-run" });

    const loaded = await getDemoDatasetForOwner(ownerId, surveyId);
    expect(loaded?.responseCount).toBe(7);
    expect(loaded?.seed).toBe("second-run");

    const rows = await getDemoResponseRowsForOwner(ownerId, surveyId, 50);
    expect(rows?.responses).toHaveLength(7);
  });

  it("never mixes demo data into real responses", async () => {
    await persist(15);
    const demo = await getDemoDatasetForOwner(ownerId, surveyId);
    const real = await listResponsesForOwner(ownerId, surveyId, 100);

    expect(demo?.responseCount).toBe(15);
    expect(real?.total).toBe(0);
    expect(real?.responses).toHaveLength(0);
  });

  it("rejects counts outside the allowed bounds", async () => {
    await expect(
      replaceDemoDataset(ownerId, surveyId, { count: 0, responses: [] }),
    ).rejects.toThrow(/between/);
    await expect(
      replaceDemoDataset(ownerId, surveyId, { count: 99999, responses: [] }),
    ).rejects.toThrow(/between/);
  });

  it("rejects invalid generated answers before writing", async () => {
    await expect(
      replaceDemoDataset(ownerId, surveyId, {
        count: 1,
        responses: [
          {
            answers: questionRows.map((question) => ({
              questionId: question.id,
              value:
                question.type === "dropdown"
                  ? "History"
                  : answerFor(question, 0),
            })),
          },
        ],
      }),
    ).rejects.toThrow(/invalid/i);
  });

  it("denies generating for a survey the user does not own", async () => {
    await expect(
      replaceDemoDataset("someone-else", surveyId, {
        count: 5,
        responses: makeResponses(5),
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("deletes only the dataset", async () => {
    await persist(5);
    expect(await getDemoDatasetForOwner(ownerId, surveyId)).toBeTruthy();

    expect(await deleteDemoDatasetForOwner(ownerId, surveyId)).toBe(true);
    expect(await getDemoDatasetForOwner(ownerId, surveyId)).toBeNull();
    expect(await deleteDemoDatasetForOwner(ownerId, surveyId)).toBe(false);

    const remaining = await db
      .select()
      .from(demoDatasets)
      .where(eq(demoDatasets.surveyId, surveyId));
    expect(remaining).toHaveLength(0);

    const stillThere = await db
      .select({ id: surveys.id })
      .from(surveys)
      .where(eq(surveys.id, surveyId));
    expect(stillThere).toHaveLength(1);
  });
});
