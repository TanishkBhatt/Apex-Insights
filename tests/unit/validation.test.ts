import { describe, expect, it } from "vitest";
import { questionInputSchema, surveyWithQuestionsSchema } from "@/lib/validation/survey";
import { validateAnswer } from "@/lib/validation/answers";

describe("question validation", () => {
  it("rejects a blank question title", () => {
    const result = questionInputSchema.safeParse({
      type: "short_text",
      title: "   ",
      required: false,
      config: {},
    });
    expect(result.success).toBe(false);
  });

  it("requires at least two options for choice questions", () => {
    const result = questionInputSchema.safeParse({
      type: "single_choice",
      title: "Favourite subject?",
      required: true,
      config: { options: ["Maths"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate options case-insensitively", () => {
    const result = questionInputSchema.safeParse({
      type: "dropdown",
      title: "Pick one",
      required: false,
      config: { options: ["Yes", "yes"] },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid slider", () => {
    const result = questionInputSchema.safeParse({
      type: "slider",
      title: "Rate this",
      required: true,
      config: { min: 1, max: 5, step: 1, minLabel: "Low", maxLabel: "High" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a slider where max <= min", () => {
    const result = questionInputSchema.safeParse({
      type: "slider",
      title: "Rate this",
      required: true,
      config: { min: 5, max: 5, step: 1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects the legacy linear scale on new surveys", () => {
    const result = questionInputSchema.safeParse({
      type: "linear_scale",
      title: "Legacy",
      required: true,
      config: { min: 1, max: 5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects options on a yes/no question", () => {
    const result = questionInputSchema.safeParse({
      type: "yes_no",
      title: "Do you agree?",
      required: false,
      config: { options: ["a", "b"] },
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["number", { min: 0, max: 100, step: 0.5 }],
    ["email", { placeholder: "name@example.com" }],
    ["slider", { min: 0, max: 10, step: 1, helpText: "Pick a number" }],
    ["rating", { icon: "heart" }],
    ["nps", {}],
    ["ranking", { options: ["A", "B", "C"] }],
    ["matrix", { rows: ["Speed"], columns: ["Slow", "Fast"] }],
    ["single_choice", { options: ["A", "B"], allowOther: true, shuffleOptions: true }],
    ["multiple_choice", { options: ["A", "B"], allowOther: true }],
  ])("accepts a valid %s question", (type, config) => {
    const result = questionInputSchema.safeParse({
      type,
      title: "Question",
      required: false,
      config,
    });
    expect(result.success).toBe(true);
  });

  it("rejects Other on question types that do not support it", () => {
    const result = questionInputSchema.safeParse({
      type: "dropdown",
      title: "Pick one",
      required: false,
      config: { options: ["A", "B"], allowOther: true },
    });
    expect(result.success).toBe(false);
  });

  it("rejects options that start with the reserved Other prefix", () => {
    const result = questionInputSchema.safeParse({
      type: "single_choice",
      title: "Pick one",
      required: false,
      config: { options: ["A", "Other: custom"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects slider steps larger than the range", () => {
    const result = questionInputSchema.safeParse({
      type: "slider",
      title: "Rate",
      required: false,
      config: { min: 0, max: 5, step: 10 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate matrix labels", () => {
    const result = questionInputSchema.safeParse({
      type: "matrix",
      title: "Rate",
      required: false,
      config: { rows: ["Speed", "speed"], columns: ["Slow", "Fast"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects configuration that does not belong to the type", () => {
    const result = questionInputSchema.safeParse({
      type: "yes_no",
      title: "Agree?",
      required: false,
      config: { options: ["A", "B"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields on a question", () => {
    const result = questionInputSchema.safeParse({
      type: "short_text",
      title: "Name",
      required: false,
      config: {},
      evil: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("survey settings validation", () => {
  it("accepts thank-you, close date and response limit settings", () => {
    const result = surveyWithQuestionsSchema.safeParse({
      title: "Feedback",
      thankYouMessage: "Thanks!",
      closesAt: "2026-12-31T23:59:00.000Z",
      maxResponses: 500,
      questions: [{ type: "yes_no", title: "Q1", required: false, config: {} }],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.maxResponses).toBe(500);
    expect(result.data.closesAt).toBeInstanceOf(Date);
  });

  it("rejects an invalid response limit", () => {
    const result = surveyWithQuestionsSchema.safeParse({
      title: "Feedback",
      maxResponses: 0,
      questions: [{ type: "yes_no", title: "Q1", required: false, config: {} }],
    });
    expect(result.success).toBe(false);
  });
});

describe("survey validation", () => {
  it("requires at least one question", () => {
    const result = surveyWithQuestionsSchema.safeParse({ title: "Survey", questions: [] });
    expect(result.success).toBe(false);
  });

  it("requires a non-blank title", () => {
    const result = surveyWithQuestionsSchema.safeParse({
      title: "   ",
      questions: [{ type: "yes_no", title: "Q1", required: false, config: {} }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed survey", () => {
    const result = surveyWithQuestionsSchema.safeParse({
      title: "Student wellbeing",
      description: "Short survey",
      questions: [
        { type: "yes_no", title: "Do you feel supported?", required: true, config: {} },
        {
          type: "single_choice",
          title: "Year group",
          required: false,
          config: { options: ["Year 10", "Year 11"] },
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("answer validation", () => {
  const choiceQuestion = {
    id: "q1",
    type: "single_choice" as const,
    required: true,
    config: { options: ["A", "B"] },
  };

  it("accepts a value in the option list", () => {
    const result = validateAnswer(choiceQuestion, "A");
    expect(result).toEqual({ ok: true, answered: true, value: "A" });
  });

  it("rejects a value outside the option list", () => {
    const result = validateAnswer(choiceQuestion, "C");
    expect(result.ok).toBe(false);
  });

  it("rejects a missing required answer", () => {
    expect(validateAnswer(choiceQuestion, "").ok).toBe(false);
    expect(validateAnswer(choiceQuestion, undefined).ok).toBe(false);
  });

  it("allows an empty optional answer", () => {
    const result = validateAnswer({ ...choiceQuestion, required: false }, "");
    expect(result).toEqual({ ok: true, answered: false });
  });

  it("validates multiple choice selections", () => {
    const question = {
      id: "q2",
      type: "multiple_choice" as const,
      required: false,
      config: { options: ["A", "B", "C"] },
    };
    expect(validateAnswer(question, ["A", "C"])).toEqual({
      ok: true,
      answered: true,
      value: ["A", "C"],
    });
    expect(validateAnswer(question, ["A", "Z"]).ok).toBe(false);
    expect(validateAnswer(question, ["A", "A"])).toEqual({
      ok: true,
      answered: true,
      value: ["A"],
    });
  });

  it("enforces slider bounds and step alignment", () => {
    const question = {
      id: "q3",
      type: "slider" as const,
      required: true,
      config: { min: 1, max: 5, step: 1 },
    };
    expect(validateAnswer(question, 3).ok).toBe(true);
    expect(validateAnswer(question, 6).ok).toBe(false);
    expect(validateAnswer(question, 2.5).ok).toBe(false);
  });

  it("still validates legacy linear scale answers", () => {
    const question = {
      id: "q3b",
      type: "linear_scale" as const,
      required: true,
      config: { min: 1, max: 5 },
    };
    expect(validateAnswer(question, 3).ok).toBe(true);
    expect(validateAnswer(question, 6).ok).toBe(false);
  });

  it("accepts boolean and string forms for yes/no", () => {
    const question = {
      id: "q4",
      type: "yes_no" as const,
      required: true,
      config: {},
    };
    expect(validateAnswer(question, true)).toEqual({ ok: true, answered: true, value: true });
    expect(validateAnswer(question, "no")).toEqual({ ok: true, answered: true, value: false });
    expect(validateAnswer(question, "maybe").ok).toBe(false);
  });

  it("validates email answers", () => {
    const question = {
      id: "q6",
      type: "email" as const,
      required: true,
      config: {},
    };
    expect(validateAnswer(question, "name@example.com").ok).toBe(true);
    expect(validateAnswer(question, "not-an-email").ok).toBe(false);
  });

  it("validates number bounds and steps", () => {
    const question = {
      id: "q7",
      type: "number" as const,
      required: true,
      config: { min: 0, max: 10, step: 0.5 },
    };
    expect(validateAnswer(question, 4.5).ok).toBe(true);
    expect(validateAnswer(question, 4.3).ok).toBe(false);
    expect(validateAnswer(question, 11).ok).toBe(false);
  });

  it("validates rating and NPS bounds", () => {
    const rating = {
      id: "q8",
      type: "rating" as const,
      required: true,
      config: {},
    };
    expect(validateAnswer(rating, 5).ok).toBe(true);
    expect(validateAnswer(rating, 6).ok).toBe(false);
    const nps = { id: "q9", type: "nps" as const, required: true, config: {} };
    expect(validateAnswer(nps, 0).ok).toBe(true);
    expect(validateAnswer(nps, 10).ok).toBe(true);
    expect(validateAnswer(nps, 11).ok).toBe(false);
  });

  it("validates ranking completeness", () => {
    const question = {
      id: "q10",
      type: "ranking" as const,
      required: true,
      config: { options: ["A", "B", "C"] },
    };
    expect(validateAnswer(question, ["B", "A", "C"]).ok).toBe(true);
    expect(validateAnswer(question, ["B", "A"]).ok).toBe(false);
    expect(validateAnswer(question, ["B", "A", "A"]).ok).toBe(false);
  });

  it("validates matrix rows and columns", () => {
    const question = {
      id: "q11",
      type: "matrix" as const,
      required: true,
      config: { rows: ["Speed", "Price"], columns: ["Poor", "Good"] },
    };
    expect(
      validateAnswer(question, { Speed: "Good", Price: "Poor" }).ok,
    ).toBe(true);
    expect(validateAnswer(question, { Speed: "Good" }).ok).toBe(false);
    expect(
      validateAnswer(question, { Speed: "Good", Price: "Unknown" }).ok,
    ).toBe(false);
  });

  it("supports the Other option on single and multiple choice", () => {
    const single = {
      id: "q12",
      type: "single_choice" as const,
      required: true,
      config: { options: ["A", "B"], allowOther: true },
    };
    expect(validateAnswer(single, "Other: Custom")).toEqual({
      ok: true,
      answered: true,
      value: "Other: Custom",
    });
    expect(validateAnswer(single, "Other: ").ok).toBe(false);

    const multiple = {
      id: "q13",
      type: "multiple_choice" as const,
      required: false,
      config: { options: ["A", "B"], allowOther: true },
    };
    expect(validateAnswer(multiple, ["A", "Other: Custom"]).ok).toBe(true);
    expect(
      validateAnswer(multiple, ["Other: One", "Other: Two"]).ok,
    ).toBe(false);
  });

  it("enforces text length limits", () => {
    const question = {
      id: "q5",
      type: "short_text" as const,
      required: true,
      config: {},
    };
    expect(validateAnswer(question, "hello").ok).toBe(true);
    expect(validateAnswer(question, "x".repeat(501)).ok).toBe(false);
  });
});
