import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { Question } from "@/db/schema";
import {
  attachmentDisposition,
  buildResponsesCsv,
  buildResponsesJson,
  contentDispositionFilename,
  exportFolderName,
  formatAnswerValue,
  zipFilename,
} from "@/lib/exports/formatters";
import { buildSurveyExportZip } from "@/lib/exports/zip";
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
    expect(formatAnswerValue("matrix", { R1: "Good", R2: "Bad" })).toBe(
      "R1: Good; R2: Bad",
    );
    expect(formatAnswerValue("ranking", ["B", "A"])).toBe("B; A");
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

describe("export filenames", () => {
  it("builds the survey folder and zip names", () => {
    expect(exportFolderName("Student Wellbeing: 2026/27")).toBe(
      "Student Wellbeing 2026 27 - ApexInsights",
    );
    expect(exportFolderName("   ")).toBe("Survey - ApexInsights");
    expect(zipFilename("Student Wellbeing")).toBe(
      "Student Wellbeing - ApexInsights.zip",
    );
  });

  it("provides an ASCII fallback plus UTF-8 filename", () => {
    const disposition = attachmentDisposition("Caf\u00e9 Survey - ApexInsights.zip");
    expect(disposition).toContain('filename="Caf_ Survey - ApexInsights.zip"');
    expect(disposition).toContain("filename*=UTF-8''Caf%C3%A9%20Survey%20-%20ApexInsights.zip");
  });
});

describe("buildSurveyExportZip", () => {
  it("creates the survey folder with csv and json exports", async () => {
    const questions = [
      question({ id: "q1", title: "Name", type: "short_text" }),
      question({ id: "q2", title: "Score", type: "slider", config: { min: 0, max: 10, step: 1 } }),
    ];
    const rows: AnalyticsRow[] = [
      {
        submittedAt: new Date("2026-03-01T09:00:00Z"),
        answers: [
          { questionId: "q1", type: "short_text", value: "Ada" },
          { questionId: "q2", type: "slider", value: 7 },
        ],
      },
    ];

    const { bytes, folderName } = await buildSurveyExportZip({
      survey: { id: "survey-1", title: "Feedback", description: null, status: "published" },
      questions,
      rows,
      source: "real",
    });

    const zip = await JSZip.loadAsync(bytes);
    const csvFile = zip.file(`${folderName}/responses.csv`);
    const jsonFile = zip.file(`${folderName}/responses.json`);
    expect(csvFile).toBeTruthy();
    expect(jsonFile).toBeTruthy();
    expect(await csvFile!.async("string")).toContain("Ada");
    const payload = JSON.parse(await jsonFile!.async("string"));
    expect(payload.responseCount).toBe(1);
    expect(payload.responses[0].answers).toEqual([
      { questionId: "q1", value: "Ada" },
      { questionId: "q2", value: 7 },
    ]);
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
