import { describe, expect, it } from "vitest";
import type { Question } from "@/db/schema";
import {
  buildResponsesCsv,
  buildResponsesJson,
  formatAnswerValue,
  toPdfSafeText,
} from "@/lib/exports/formatters";
import { buildResponsesPdf, contentDispositionFilename } from "@/lib/exports/pdf";
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

describe("toPdfSafeText", () => {
  it("replaces typographic punctuation and strips unsupported characters", () => {
    expect(toPdfSafeText("It\u2019s \u201Cquoted\u201D \u2014 yes\u2026")).toBe(
      'It\'s "quoted" - yes...',
    );
    expect(toPdfSafeText("emoji \u{1F600} here")).toBe("emoji  here");
  });
});

describe("buildResponsesPdf", () => {
  it("produces a valid, non-empty PDF for a survey with responses", async () => {
    const questions = [
      question({ id: "q1", title: "Favourite subject?", type: "dropdown" }),
      question({ id: "q2", title: "Comments?", type: "paragraph" }),
    ];
    const rows: AnalyticsRow[] = [
      {
        submittedAt: new Date("2026-03-01T09:00:00Z"),
        answers: [
          { questionId: "q1", type: "dropdown", value: "Maths" },
          { questionId: "q2", type: "paragraph", value: "Great course \u2014 thanks!" },
        ],
      },
    ];

    const bytes = await buildResponsesPdf({
      survey: { id: "survey-1", title: "PDF test", description: null, status: "published" },
      questions,
      rows,
      source: "real",
      generatedAt: new Date("2026-03-02T00:00:00Z"),
    });

    expect(bytes.length).toBeGreaterThan(500);
    const header = Buffer.from(bytes.subarray(0, 5)).toString("latin1");
    expect(header).toBe("%PDF-");
  });

  it("handles an empty response set without throwing", async () => {
    const bytes = await buildResponsesPdf({
      survey: { id: "survey-1", title: "Empty", description: null, status: "draft" },
      questions: [question({ id: "q1", title: "Anything?", type: "short_text" })],
      rows: [],
      source: "demo",
      generatedAt: new Date(),
    });
    expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
  });
});

describe("contentDispositionFilename", () => {
  it("slugifies the title and appends source and extension", () => {
    expect(contentDispositionFilename("Customer Satisfaction 2026!", "real", "csv")).toBe(
      "customer-satisfaction-2026-real.csv",
    );
    expect(contentDispositionFilename("   ", "demo", "pdf")).toBe("survey-demo.pdf");
  });
});
