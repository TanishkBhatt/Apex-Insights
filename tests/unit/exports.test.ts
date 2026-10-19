import { describe, expect, it } from "vitest";
import type { Question } from "@/db/schema";
import {
  buildResponsesCsv,
  buildResponsesJson,
  contentDispositionFilename,
  formatAnswerValue,
} from "@/lib/exports/formatters";
import type { AnalyticsRow } from "@/lib/analytics/compute";

function question(partial: Partial<Question> & { id: string; title: string; type: string }): Question {
  return {
    surveyId: "survey-1",
    position: 0,
    required: false,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as unknown as Question;
}

describe("formatAnswerValue", () => {
  it("formats each answer type", () => {
    expect(formatAnswerValue("yes_no", true)).toBe("Yes");
    expect(formatAnswerValue("yes_no", false)).toBe("No");
    expect(formatAnswerValue("multiple_choice", ["A", "B"])).toBe("A; B");
    expect(formatAnswerValue("linear_scale", 4)).toBe("4");
    expect(formatAnswerValue("short_text", "")).toBe("");
    expect(formatAnswerValue("short_text", null)).toBe("");
  });
});

describe("buildResponsesCsv", () => {
  const questions = [
    question({ id: "q1", title: "Name", type: "short_text" }),
    question({ id: "q2", title: "Pick, one", type: "single_choice" }),
  ];
  const rows: AnalyticsRow[] = [
    {
      submittedAt: new Date("2026-03-01T09:00:00Z"),
      answers: [
        { questionId: "q1", type: "short_text", value: 'He said "hi"' },
        { questionId: "q2", type: "single_choice", value: "A, B" },
      ],
    },
  ];

  it("produces a header row with question titles", () => {
    const csv = buildResponsesCsv(questions, rows, "real");
    const [header] = csv.split("\r\n");
    expect(header).toBe("Submitted at,Name,\"Pick, one\",Source");
  });

  it("quotes fields that contain commas or quotes and doubles inner quotes", () => {
    const csv = buildResponsesCsv(questions, rows, "real");
    expect(csv).toContain('"He said ""hi"""');
    expect(csv).toContain('"A, B"');
    expect(csv).toContain(",real\r\n");
  });

  it("writes one line per response plus a trailing newline", () => {
    const csv = buildResponsesCsv(questions, rows, "real");
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(rows.length + 1);
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("buildResponsesJson", () => {
  it("serialises survey metadata, questions, and responses", () => {
    const payload = buildResponsesJson(
      { id: "survey-1", title: "Test", description: null, status: "published" },
      [question({ id: "q1", title: "Name", type: "short_text" })],
      [
        {
          submittedAt: new Date("2026-03-01T09:00:00Z"),
          answers: [{ questionId: "q1", type: "short_text", value: "Ada" }],
        },
      ],
      "demo",
    );
    expect(payload.source).toBe("demo");
    expect(payload.responseCount).toBe(1);
    expect(payload.questionCount).toBe(1);
    expect(payload.questions[0]).toMatchObject({ id: "q1", title: "Name", type: "short_text" });
    expect(payload.responses[0].answers[0]).toEqual({ questionId: "q1", value: "Ada" });
    expect(typeof payload.generatedAt).toBe("string");
  });
});

describe("contentDispositionFilename", () => {
  it("slugifies the title and appends source and extension", () => {
    expect(contentDispositionFilename("Customer Satisfaction 2026!", "real", "csv")).toBe(
      "customer-satisfaction-2026-real.csv",
    );
    expect(contentDispositionFilename("   ", "demo", "json")).toBe("survey-demo.json");
  });
});
