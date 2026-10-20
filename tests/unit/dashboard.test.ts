import { describe, expect, it } from "vitest";
import {
  activityTotal,
  percentageChange,
} from "@/lib/dashboard/activity-shared";
import {
  filterSurveys,
  sortSurveys,
  type DashboardSurvey,
} from "@/lib/dashboard/filter";

const surveys: DashboardSurvey[] = [
  {
    id: "1",
    title: "Student wellbeing",
    slug: "student-1",
    status: "published",
    questionCount: 4,
    realResponseCount: 12,
    demoResponseCount: 0,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-05T10:00:00.000Z",
    publicUrl: "http://localhost:3000/survey/student-1",
  },
  {
    id: "2",
    title: "Event RSVP",
    slug: "event-2",
    status: "draft",
    questionCount: 0,
    realResponseCount: 0,
    demoResponseCount: 20,
    createdAt: "2026-03-04T10:00:00.000Z",
    updatedAt: "2026-03-04T10:00:00.000Z",
    publicUrl: "http://localhost:3000/survey/event-2",
  },
  {
    id: "3",
    title: "Course feedback",
    slug: "course-3",
    status: "closed",
    questionCount: 5,
    realResponseCount: 30,
    demoResponseCount: 10,
    createdAt: "2026-02-20T10:00:00.000Z",
    updatedAt: "2026-03-02T10:00:00.000Z",
    publicUrl: "http://localhost:3000/survey/course-3",
  },
];

describe("dashboard filtering", () => {
  it("filters by status and search text", () => {
    expect(filterSurveys(surveys, { status: "published" })).toHaveLength(1);
    expect(
      filterSurveys(surveys, { query: "course", status: "all" }).map(
        (survey) => survey.id,
      ),
    ).toEqual(["3"]);
    expect(
      filterSurveys(surveys, { query: "event-2", status: "all" }).map(
        (survey) => survey.id,
      ),
    ).toEqual(["2"]);
  });

  it("sorts by updated, created, responses and title", () => {
    expect(sortSurveys(surveys, "updated").map((survey) => survey.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(sortSurveys(surveys, "created").map((survey) => survey.id)).toEqual([
      "2",
      "1",
      "3",
    ]);
    expect(sortSurveys(surveys, "responses").map((survey) => survey.id)).toEqual([
      "3",
      "1",
      "2",
    ]);
    expect(sortSurveys(surveys, "title").map((survey) => survey.id)).toEqual([
      "3",
      "2",
      "1",
    ]);
  });
});

describe("dashboard activity helpers", () => {
  it("sums activity points", () => {
    expect(
      activityTotal([
        { date: "2026-03-01", count: 2 },
        { date: "2026-03-02", count: 3 },
      ]),
    ).toBe(5);
  });

  it("calculates period-over-period change", () => {
    expect(percentageChange(15, 10)).toBe(50);
    expect(percentageChange(5, 10)).toBe(-50);
    expect(percentageChange(0, 0)).toBe(0);
    expect(percentageChange(4, 0)).toBeNull();
  });
});
