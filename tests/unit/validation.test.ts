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

  it("accepts a valid linear scale", () => {
    const result = questionInputSchema.safeParse({
      type: "linear_scale",
      title: "Rate this",
      required: true,
      config: { min: 1, max: 5, minLabel: "Low", maxLabel: "High" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a linear scale where max <= min", () => {
    const result = questionInputSchema.safeParse({
      type: "linear_scale",
      title: "Rate this",
      required: true,
      config: { min: 5, max: 5 },
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

  it("enforces linear scale bounds", () => {
    const question = {
      id: "q3",
      type: "linear_scale" as const,
      required: true,
      config: { min: 1, max: 5 },
    };
    expect(validateAnswer(question, 3).ok).toBe(true);
    expect(validateAnswer(question, 6).ok).toBe(false);
    expect(validateAnswer(question, 2.5).ok).toBe(false);
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
