import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { demoDatasets, responses, surveys } from "@/db/schema";
import type {
  DailyActivityPoint,
  DashboardActivity,
} from "@/lib/dashboard/activity-shared";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildSeries(
  dates: Date[],
  days: number,
  now: Date,
): DailyActivityPoint[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    if (Number.isNaN(date.getTime())) continue;
    const key = dateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = startOfUtcDay(now);
  const points: DailyActivityPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = dateKey(new Date(today.getTime() - offset * DAY_MS));
    points.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return points;
}

export async function getDashboardActivity(
  ownerId: string,
  days = 14,
): Promise<DashboardActivity> {
  const now = new Date();
  const currentStart = startOfUtcDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  const previousStart = new Date(currentStart.getTime() - days * DAY_MS);

  const [surveyRows, responseRows, demoRows] = await Promise.all([
    db
      .select({ createdAt: surveys.createdAt })
      .from(surveys)
      .where(and(eq(surveys.ownerId, ownerId), gte(surveys.createdAt, previousStart))),
    db
      .select({ submittedAt: responses.submittedAt })
      .from(responses)
      .innerJoin(surveys, eq(surveys.id, responses.surveyId))
      .where(
        and(
          eq(surveys.ownerId, ownerId),
          gte(responses.submittedAt, previousStart),
        ),
      ),
    db
      .select({ createdAt: demoDatasets.createdAt })
      .from(demoDatasets)
      .where(
        and(
          eq(demoDatasets.ownerId, ownerId),
          gte(demoDatasets.createdAt, previousStart),
        ),
      ),
  ]);

  const surveyDates = surveyRows.map((row) => row.createdAt);
  const realDates = responseRows.map((row) => row.submittedAt);
  const demoDates = demoRows.map((row) => row.createdAt);

  const recent = (dates: Date[]) =>
    dates.filter((date) => date.getTime() >= currentStart.getTime()).length;
  const previous = (dates: Date[]) =>
    dates.filter(
      (date) =>
        date.getTime() >= previousStart.getTime() &&
        date.getTime() < currentStart.getTime(),
    ).length;

  return {
    days,
    timeline: buildSeries(realDates, days, now),
    surveysSeries: buildSeries(surveyDates, days, now),
    realSeries: buildSeries(realDates, days, now),
    demoSeries: buildSeries(demoDates, days, now),
    surveysRecent: recent(surveyDates),
    realRecent: recent(realDates),
    realPrevious: previous(realDates),
    demoRecent: recent(demoDates),
  };
}
