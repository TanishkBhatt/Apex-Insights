import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { withDbRetry } from "@/lib/db-retry";
import { demoDatasets, surveys, user } from "@/db/schema";
import { createSurvey, transitionSurveyStatus } from "@/lib/surveys/service";
import {
  deleteDemoDatasetForOwner,
  generateSyntheticDataset,
  getDemoDatasetForOwner,
  getDemoResponseRowsForOwner,
} from "@/lib/synthetic/generator";
import { listResponsesForOwner } from "@/lib/responses/service";
import type { SurveyWithQuestionsInput } from "@/lib/validation/survey";

const ownerId = `test-demo-owner-${randomUUID()}`;

const input: SurveyWithQuestionsInput = {
  title: "Demo generator survey",
  description: "Temporary",
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
      type: "linear_scale",
      title: "How happy are you?",
      required: true,
      config: { min: 1, max: 5, minLabel: "Low", maxLabel: "High" },
    },
    { type: "yes_no", title: "Would recommend?", required: false, config: {} },
    { type: "short_text", title: "What is your full name?", required: false, config: {} },
    { type: "short_text", title: "Describe your day", required: false, config: {} },
  ],
};

let surveyId: string;

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
});

afterAll(async () => {
  await withDbRetry(() => db.delete(user).where(eq(user.id, ownerId)));
});

describe("synthetic generator", () => {
  it("generates the requested number of demo responses", async () => {
    const dataset = await generateSyntheticDataset(ownerId, surveyId, "count-seed", 12);
    expect(dataset).toBeTruthy();

    const loaded = await getDemoDatasetForOwner(ownerId, surveyId);
    expect(loaded?.responseCount).toBe(12);
    expect(loaded?.seed).toBe("count-seed");
  });

  it("produces every answer type without errors", async () => {
    await generateSyntheticDataset(ownerId, surveyId, "types-seed", 8);
    const rows = await getDemoResponseRowsForOwner(ownerId, surveyId, 8);
    expect(rows?.responses).toHaveLength(8);

    for (const response of rows!.responses) {
      expect(response.answers).toHaveLength(6);
      const [dropdown, paragraph, scale, yesNo, nameText, otherText] = response.answers;
      expect(["Maths", "Science", "Art"]).toContain(dropdown.value);
      expect(paragraph.value).toBe("");
      expect(typeof scale.value).toBe("number");
      expect(scale.value).toBeGreaterThanOrEqual(1);
      expect(scale.value).toBeLessThanOrEqual(5);
      expect(typeof yesNo.value).toBe("boolean");
      expect(nameText.value).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
      expect(otherText.value).toBe("");
    }
  });

  it("is reproducible for the same seed and count", async () => {
    await generateSyntheticDataset(ownerId, surveyId, "repro-seed", 6);
    const first = await getDemoResponseRowsForOwner(ownerId, surveyId, 10);
    const snapshotFirst = JSON.stringify(first!.responses.map((r) => r.answers));

    await generateSyntheticDataset(ownerId, surveyId, "repro-seed", 6);
    const second = await getDemoResponseRowsForOwner(ownerId, surveyId, 10);
    const snapshotSecond = JSON.stringify(second!.responses.map((r) => r.answers));

    expect(snapshotSecond).toBe(snapshotFirst);
  });

  it("produces different data for a different seed", async () => {
    await generateSyntheticDataset(ownerId, surveyId, "seed-A", 6);
    const first = await getDemoResponseRowsForOwner(ownerId, surveyId, 10);
    const snapshotFirst = JSON.stringify(first!.responses.map((r) => r.answers));

    await generateSyntheticDataset(ownerId, surveyId, "seed-B", 6);
    const second = await getDemoResponseRowsForOwner(ownerId, surveyId, 10);
    const snapshotSecond = JSON.stringify(second!.responses.map((r) => r.answers));

    expect(snapshotSecond).not.toBe(snapshotFirst);
  });

  it("never mixes demo data into real responses", async () => {
    await generateSyntheticDataset(ownerId, surveyId, "isolation-seed", 15);
    const demo = await getDemoDatasetForOwner(ownerId, surveyId);
    const real = await listResponsesForOwner(ownerId, surveyId, 100);

    expect(demo?.responseCount).toBe(15);
    expect(real?.total).toBe(0);
    expect(real?.responses).toHaveLength(0);
  });

  it("rejects counts outside the allowed bounds", async () => {
    await expect(
      generateSyntheticDataset(ownerId, surveyId, "bad-count", 0),
    ).rejects.toThrow(/between/);
    await expect(
      generateSyntheticDataset(ownerId, surveyId, "bad-count", 99999),
    ).rejects.toThrow(/between/);
  });

  it("denies generating for a survey the user does not own", async () => {
    await expect(
      generateSyntheticDataset("someone-else", surveyId, "nope", 5),
    ).rejects.toThrow(/not found/i);
  });

  it("deletes only the dataset", async () => {
    await generateSyntheticDataset(ownerId, surveyId, "delete-seed", 5);
    expect(await getDemoDatasetForOwner(ownerId, surveyId)).toBeTruthy();

    expect(await deleteDemoDatasetForOwner(ownerId, surveyId)).toBe(true);
    expect(await getDemoDatasetForOwner(ownerId, surveyId)).toBeNull();
    expect(await deleteDemoDatasetForOwner(ownerId, surveyId)).toBe(false);

    const remaining = await db
      .select()
      .from(demoDatasets)
      .where(eq(demoDatasets.surveyId, surveyId));
    expect(remaining).toHaveLength(0);

    // The survey itself survives.
    const stillThere = await db
      .select({ id: surveys.id })
      .from(surveys)
      .where(eq(surveys.id, surveyId));
    expect(stillThere).toHaveLength(1);
  });
});
