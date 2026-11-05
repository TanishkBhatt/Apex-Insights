import { describe, expect, it } from "vitest";
import type { Question } from "@/db/schema";
import {
  buildDemoPrompt,
  validateDemoBatch,
} from "@/lib/ai/demo";
import {
  buildSurveyPrompt,
  validateAiSurveyResponse,
} from "@/lib/ai/survey";
import type { AiSurveyRequest } from "@/lib/validation/survey";

function question(
  overrides: Partial<Question> & Pick<Question, "id" | "type" | "title">,
): Question {
  return {
    surveyId: "00000000-0000-4000-8000-000000000000",
    required: true,
    position: 0,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Question;
}

const questions: Question[] = [
  question({
    id: "11111111-1111-4111-8111-111111111111",
    type: "short_text",
    title: "What went well?",
  }),
  question({
    id: "22222222-2222-4222-8222-222222222222",
    type: "multiple_choice",
    title: "Which topics helped?",
    config: { options: ["Practice", "Feedback", "Examples"] },
  }),
  question({
    id: "33333333-3333-4333-8333-333333333333",
    type: "ranking",
    title: "Order the priorities",
    config: { options: ["Speed", "Quality", "Cost"] },
  }),
  question({
    id: "44444444-4444-4444-8444-444444444444",
    type: "matrix",
    title: "Rate these areas",
    config: {
      rows: ["Teaching", "Materials"],
      columns: ["Poor", "Good", "Excellent"],
    },
  }),
];

describe("validateDemoBatch", () => {
  it("accepts valid structured answers", () => {
    const result = validateDemoBatch(
      {
        responses: [
          {
            answers: {
              [questions[0].id]: "The practical examples were the most useful part.",
              [questions[1].id]: ["Practice", "Examples"],
              [questions[2].id]: ["Quality", "Speed", "Cost"],
              [questions[3].id]: { Teaching: "Good", Materials: "Excellent" },
            },
          },
        ],
      },
      questions,
      1,
    );

    expect(result).toHaveLength(1);
    expect(result[0].answers).toHaveLength(4);
  });

  it("rejects a missing required answer", () => {
    expect(() =>
      validateDemoBatch(
        {
          responses: [
            {
              answers: {
                [questions[0].id]: "",
                [questions[1].id]: ["Practice"],
                [questions[2].id]: ["Speed", "Quality", "Cost"],
                [questions[3].id]: { Teaching: "Good", Materials: "Good" },
              },
            },
          ],
        },
        questions,
        1,
      ),
    ).toThrow(/required/i);
  });

  it("rejects options not present in the question configuration", () => {
    expect(() =>
      validateDemoBatch(
        {
          responses: [
            {
              answers: {
                [questions[0].id]: "Good pace.",
                [questions[1].id]: ["Practice", "A topic that does not exist"],
                [questions[2].id]: ["Speed", "Quality", "Cost"],
                [questions[3].id]: { Teaching: "Good", Materials: "Good" },
              },
            },
          ],
        },
        questions,
        1,
      ),
    ).toThrow(/not part of this question/i);
  });

  it("rejects incorrect response counts and unknown IDs", () => {
    expect(() =>
      validateDemoBatch({ responses: [] }, questions, 1),
    ).toThrow(/exactly 1/i);

    expect(() =>
      validateDemoBatch(
        { responses: [{ answers: { "unknown-id": "value" } }] },
        questions,
        1,
      ),
    ).toThrow(/unknown question IDs/i);
  });
});

describe("demo prompts", () => {
  it("includes the question IDs, options and owner context", () => {
    const prompt = buildDemoPrompt({
      surveyTitle: "Course feedback",
      surveyDescription: "End of term",
      context: "First-year university students",
      questions,
      count: 12,
      batchIndex: 0,
    });

    expect(prompt).toContain("exactly 12");
    expect(prompt).toContain(questions[0].id);
    expect(prompt).toContain("Practice");
    expect(prompt).toContain("First-year university students");
    expect(prompt).toContain("example.com");
  });
});

describe("validateAiSurveyResponse", () => {
  it("normalizes a valid generated survey", () => {
    const result = validateAiSurveyResponse({
      message: "Created a short feedback survey.",
      survey: {
        title: "Workshop feedback",
        description: "Tell us how it went.",
        thankYouMessage: "Thanks!",
        questions: [
          {
            type: "rating",
            title: "How useful was the workshop?",
            required: true,
            config: { icon: "star" },
          },
          {
            type: "single_choice",
            title: "Would you attend again?",
            required: true,
            config: { options: ["Yes", "No"] },
          },
        ],
      },
    });

    expect(result.message).toContain("feedback");
    expect(result.draft.title).toBe("Workshop feedback");
    expect(result.draft.questions).toHaveLength(2);
    expect(result.draft.questions[1].config.options).toEqual(["Yes", "No"]);
  });

  it("rejects generated surveys with invalid question configuration", () => {
    expect(() =>
      validateAiSurveyResponse({
        message: "Created.",
        survey: {
          title: "Broken survey",
          questions: [
            {
              type: "single_choice",
              title: "Choose one",
              required: true,
              config: { options: ["Same", "same"] },
            },
          ],
        },
      }),
    ).toThrow(/unique/i);
  });
});

describe("buildSurveyPrompt", () => {
  it("includes the conversation and the current draft for refinement", () => {
    const request: AiSurveyRequest = {
      messages: [
        { role: "user", content: "Create a student wellbeing survey." },
        { role: "assistant", content: "Created a first draft." },
        { role: "user", content: "Make it shorter and add an NPS question." },
      ],
      currentDraft: {
        title: "Wellbeing",
        description: null,
        thankYouMessage: null,
        closesAt: null,
        maxResponses: null,
        questions: [
          {
            type: "short_text",
            title: "How are you?",
            required: false,
            config: {},
          },
        ],
      },
    };

    const prompt = buildSurveyPrompt(request);
    expect(prompt).toContain("Make it shorter");
    expect(prompt).toContain("current survey draft");
    expect(prompt).toContain("Preserve all existing questions");
    expect(prompt).toContain("linear_scale");
  });
});
