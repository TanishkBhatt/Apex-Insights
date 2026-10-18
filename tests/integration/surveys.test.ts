import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { withDbRetry } from "@/lib/db-retry";
import { answers, questions, responses, surveys, user } from "@/db/schema";
import {
  createSurvey,
  deleteSurvey,
  getPublishedSurveyBySlug,
  getSurveyForOwner,
  listSurveysForOwner,
  transitionSurveyStatus,
  updateSurvey,
} from "@/lib/surveys/service";
import type { SurveyWithQuestionsInput } from "@/lib/validation/survey";

const ownerId = `test-owner-${randomUUID()}`;
const otherId = `test-other-${randomUUID()}`;

const baseInput: SurveyWithQuestionsInput = {
  title: "Integration test survey",
  description: "Temporary",
  questions: [
    { type: "yes_no", title: "Do you agree?", required: true, config: {} },
    {
      type: "single_choice",
      title: "Pick one",
      required: false,
      config: { options: ["A", "B"] },
    },
  ],
};

beforeAll(async () => {
  await withDbRetry(() =>
    db.insert(user).values([
      {
        id: ownerId,
        name: "Test Owner",
        email: `${ownerId}@example.test`,
        emailVerified: false,
      },
      {
        id: otherId,
        name: "Other Owner",
        email: `${otherId}@example.test`,
        emailVerified: false,
      },
    ]),
  );
});

afterAll(async () => {
  await withDbRetry(() => db.delete(user).where(eq(user.id, ownerId)));
  await withDbRetry(() => db.delete(user).where(eq(user.id, otherId)));
});

describe("survey service", () => {
  it("creates a survey with questions in order", async () => {
    const survey = await createSurvey(ownerId, baseInput);
    expect(survey.ownerId).toBe(ownerId);
    expect(survey.status).toBe("draft");
    expect(survey.slug).toMatch(/^[A-Za-z0-9_-]{12}$/);

    const loaded = await getSurveyForOwner(ownerId, survey.id);
    expect(loaded?.questions.map((q) => q.title)).toEqual(["Do you agree?", "Pick one"]);
    expect(loaded?.questions.map((q) => q.position)).toEqual([0, 1]);

    await db.delete(surveys).where(eq(surveys.id, survey.id));
  });

  it("does not allow another creator to read or update a survey", async () => {
    const survey = await createSurvey(ownerId, baseInput);

    expect(await getSurveyForOwner(otherId, survey.id)).toBeNull();

    await expect(
      updateSurvey(otherId, survey.id, { ...baseInput, title: "Hijacked" }),
    ).rejects.toThrow(/not found/i);

    expect(await deleteSurvey(otherId, survey.id)).toBe(false);

    const stillThere = await getSurveyForOwner(ownerId, survey.id);
    expect(stillThere?.title).toBe(baseInput.title);

    await db.delete(surveys).where(eq(surveys.id, survey.id));
  });

  it("publishes, exposes publicly, then closes", async () => {
    const survey = await createSurvey(ownerId, baseInput);

    const published = await transitionSurveyStatus(ownerId, survey.id, "published");
    expect(published.status).toBe("published");
    expect(published.publishedAt).not.toBeNull();

    const publicSurvey = await getPublishedSurveyBySlug(survey.slug);
    expect(publicSurvey?.title).toBe(baseInput.title);
    expect(publicSurvey?.questions).toHaveLength(2);

    await expect(transitionSurveyStatus(ownerId, survey.id, "closed")).resolves.toMatchObject({
      status: "closed",
    });
    expect(await getPublishedSurveyBySlug(survey.slug)).toBeNull();

    await db.delete(surveys).where(eq(surveys.id, survey.id));
  });

  it("keeps questions with responses but allows reordering and appends", async () => {
    const survey = await createSurvey(ownerId, baseInput);
    const loaded = await getSurveyForOwner(ownerId, survey.id);
    const first = loaded!.questions[0];
    const second = loaded!.questions[1];

    const [response] = await db
      .insert(responses)
      .values({ surveyId: survey.id })
      .returning();
    await db.insert(answers).values({
      responseId: response.id,
      questionId: first.id,
      value: true,
    });

    const updated = await updateSurvey(ownerId, survey.id, {
      title: "Renamed",
      description: null,
      questions: [
        { id: second.id, type: second.type, title: second.title, required: false, config: second.config },
        { id: first.id, type: first.type, title: "Do you agree? (edited)", required: true, config: {} },
        {
          type: "paragraph",
          title: "Anything else?",
          required: false,
          config: {},
        },
      ],
    });
    expect(updated.title).toBe("Renamed");

    const after = await getSurveyForOwner(ownerId, survey.id);
    expect(after?.questions.map((q) => q.title)).toEqual([
      "Pick one",
      "Do you agree? (edited)",
      "Anything else?",
    ]);
    expect(after?.questions.map((q) => q.position)).toEqual([0, 1, 2]);

    await db.delete(surveys).where(eq(surveys.id, survey.id));
  });

  it("blocks deleting a question that already has answers", async () => {
    const survey = await createSurvey(ownerId, baseInput);
    const loaded = await getSurveyForOwner(ownerId, survey.id);
    const question = loaded!.questions[0];

    const [response] = await db
      .insert(responses)
      .values({ surveyId: survey.id })
      .returning();
    await db.insert(answers).values({
      responseId: response.id,
      questionId: question.id,
      value: true,
    });

    await expect(
      updateSurvey(ownerId, survey.id, {
        ...baseInput,
        questions: [baseInput.questions[1]],
      }),
    ).rejects.toThrow(/cannot delete/i);

    await db.delete(surveys).where(eq(surveys.id, survey.id));
  });

  it("blocks changing the type of a question that has answers", async () => {
    const survey = await createSurvey(ownerId, baseInput);
    const loaded = await getSurveyForOwner(ownerId, survey.id);
    const question = loaded!.questions[0];

    const [response] = await db.insert(responses).values({ surveyId: survey.id }).returning();
    await db.insert(answers).values({ responseId: response.id, questionId: question.id, value: true });

    await expect(
      updateSurvey(ownerId, survey.id, {
        title: baseInput.title,
        description: null,
        questions: [{ id: question.id, type: "short_text", title: question.title, required: true, config: {} }],
      }),
    ).rejects.toThrow(/cannot change the type/i);

    await db.delete(surveys).where(eq(surveys.id, survey.id));
  });

  it("cascades deletion of surveys to questions and responses", async () => {
    const survey = await createSurvey(ownerId, baseInput);
    const loaded = await getSurveyForOwner(ownerId, survey.id);
    const [response] = await db.insert(responses).values({ surveyId: survey.id }).returning();
    await db
      .insert(answers)
      .values({ responseId: response.id, questionId: loaded!.questions[0].id, value: true });

    expect(await deleteSurvey(ownerId, survey.id)).toBe(true);

    const leftoverQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.surveyId, survey.id));
    const leftoverAnswers = await db
      .select()
      .from(answers)
      .where(eq(answers.responseId, response.id));
    expect(leftoverQuestions).toHaveLength(0);
    expect(leftoverAnswers).toHaveLength(0);
  });

  it("lists surveys with real and demo response counts", async () => {
    const survey = await createSurvey(ownerId, baseInput);
    await db.insert(responses).values({ surveyId: survey.id });

    const list = await listSurveysForOwner(ownerId);
    const found = list.find((item) => item.id === survey.id);
    expect(found?.questionCount).toBe(2);
    expect(found?.realResponseCount).toBe(1);
    expect(found?.demoResponseCount).toBe(0);

    await db.delete(surveys).where(eq(surveys.id, survey.id));
  });
});
