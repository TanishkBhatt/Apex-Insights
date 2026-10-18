import { describe, expect, it } from "vitest";
import {
  computeAnalytics,
  computeQuestionStats,
  computeTimeline,
  tokenizeText,
} from "@/lib/analytics/compute";

describe("tokenizeText", () => {
  it("lowercases, strips punctuation, and drops stop words", () => {
    const words = tokenizeText("The service was great, and the support was excellent!");
    expect(words).toContain("service");
    expect(words).toContain("great");
    expect(words).toContain("support");
    expect(words).toContain("excellent");
    expect(words).not.toContain("the");
    expect(words).not.toContain("was");
  });
});

describe("computeQuestionStats", () => {
  it("computes text stats with top words and recent answers", () => {
    const stats = computeQuestionStats("paragraph", [
      "Great support and fast service",
      "Fast delivery and great value",
      null,
      "",
    ]);
    expect(stats.kind).toBe("text");
    if (stats.kind !== "text") return;
    expect(stats.answered).toBe(2);
    expect(stats.unanswered).toBe(2);
    expect(stats.topWords[0].count).toBe(2);
    expect(stats.topWords.find((w) => w.word === "great")?.count).toBe(2);
    expect(stats.topWords.find((w) => w.word === "fast")?.count).toBe(2);
    expect(stats.recentAnswers).toHaveLength(2);
  });

  it("computes single-choice distribution sorted by count", () => {
    const stats = computeQuestionStats("single_choice", ["A", "B", "A", "A", "C"]);
    expect(stats.kind).toBe("choice");
    if (stats.kind !== "choice") return;
    expect(stats.points.map((p) => p.label)).toEqual(["A", "B", "C"]);
    expect(stats.points[0].count).toBe(3);
    expect(stats.points[0].percentage).toBe(60);
  });

  it("counts each selection for multiple-choice", () => {
    const stats = computeQuestionStats("multiple_choice", [
      ["A", "B"],
      ["A"],
      ["B", "C"],
    ]);
    expect(stats.kind).toBe("choice");
    if (stats.kind !== "choice") return;
    expect(stats.points.find((p) => p.label === "A")?.count).toBe(2);
    expect(stats.points.find((p) => p.label === "B")?.count).toBe(2);
    expect(stats.points.find((p) => p.label === "C")?.count).toBe(1);
  });

  it("computes scale mean, median, and sorted distribution", () => {
    const stats = computeQuestionStats("linear_scale", [1, 2, 3, 4, 5, null]);
    expect(stats.kind).toBe("scale");
    if (stats.kind !== "scale") return;
    expect(stats.answered).toBe(5);
    expect(stats.unanswered).toBe(1);
    expect(stats.mean).toBe(3);
    expect(stats.median).toBe(3);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(5);
    expect(stats.points.map((p) => p.label)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("computes yes/no percentages", () => {
    const stats = computeQuestionStats("yes_no", [true, false, true, true, null]);
    expect(stats.kind).toBe("boolean");
    if (stats.kind !== "boolean") return;
    const yes = stats.points.find((p) => p.label === "Yes");
    const no = stats.points.find((p) => p.label === "No");
    expect(yes?.count).toBe(3);
    expect(yes?.percentage).toBe(75);
    expect(no?.count).toBe(1);
    expect(no?.percentage).toBe(25);
  });

  it("handles an empty values array", () => {
    const stats = computeQuestionStats("linear_scale", []);
    expect(stats.kind).toBe("scale");
    if (stats.kind !== "scale") return;
    expect(stats.mean).toBeNull();
    expect(stats.answered).toBe(0);
  });
});

describe("computeTimeline", () => {
  it("groups submissions by calendar day in order", () => {
    const timeline = computeTimeline([
      { submittedAt: new Date("2026-01-02T10:00:00Z"), answers: [] },
      { submittedAt: new Date("2026-01-01T10:00:00Z"), answers: [] },
      { submittedAt: new Date("2026-01-01T23:00:00Z"), answers: [] },
    ]);
    expect(timeline).toEqual([
      { date: "2026-01-01", count: 2 },
      { date: "2026-01-02", count: 1 },
    ]);
  });
});

describe("computeAnalytics", () => {
  it("combines per-question stats, summary, and completion", () => {
    const questions = [
      { id: "q1", type: "single_choice" as const },
      { id: "q2", type: "yes_no" as const },
    ];
    const result = computeAnalytics(questions, [
      {
        submittedAt: new Date("2026-02-01T12:00:00Z"),
        answers: [
          { questionId: "q1", type: "single_choice", value: "A" },
          { questionId: "q2", type: "yes_no", value: true },
        ],
      },
      {
        submittedAt: new Date("2026-02-02T12:00:00Z"),
        answers: [{ questionId: "q1", type: "single_choice", value: "B" }],
      },
    ]);

    expect(result.summary.totalResponses).toBe(2);
    expect(result.summary.answeredByQuestion).toEqual([
      { questionId: "q1", answered: 2, percentage: 100 },
      { questionId: "q2", answered: 1, percentage: 50 },
    ]);
    expect(result.summary.timeline).toEqual([
      { date: "2026-02-01", count: 1 },
      { date: "2026-02-02", count: 1 },
    ]);
    expect(result.perQuestion).toHaveLength(2);
    expect(result.perQuestion[0].stats.kind).toBe("choice");
    expect(result.perQuestion[1].stats.kind).toBe("boolean");
  });
});
