export type DailyActivityPoint = {
  date: string;
  count: number;
};

export type DashboardActivity = {
  days: number;
  timeline: DailyActivityPoint[];
  surveysSeries: DailyActivityPoint[];
  realSeries: DailyActivityPoint[];
  demoSeries: DailyActivityPoint[];
  surveysRecent: number;
  realRecent: number;
  realPrevious: number;
  demoRecent: number;
};

export function activityTotal(points: DailyActivityPoint[]): number {
  return points.reduce((sum, point) => sum + point.count, 0);
}

export function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}
