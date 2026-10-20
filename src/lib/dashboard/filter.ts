export type DashboardSurveyStatus = "draft" | "published" | "closed";

export type DashboardSurvey = {
  id: string;
  title: string;
  slug: string;
  status: DashboardSurveyStatus;
  questionCount: number;
  realResponseCount: number;
  demoResponseCount: number;
  createdAt: string;
  updatedAt: string;
  publicUrl: string;
};

export type DashboardStatusFilter = "all" | DashboardSurveyStatus;
export type DashboardSort = "updated" | "created" | "responses" | "title";

export const STATUS_FILTERS: Array<{
  value: DashboardStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
];

export const SORT_OPTIONS: Array<{ value: DashboardSort; label: string }> = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest first" },
  { value: "responses", label: "Most responses" },
  { value: "title", label: "Title A–Z" },
];

export function filterSurveys(
  surveys: DashboardSurvey[],
  options: { query?: string; status?: DashboardStatusFilter },
): DashboardSurvey[] {
  const query = options.query?.trim().toLowerCase() ?? "";
  const status = options.status ?? "all";
  return surveys.filter((survey) => {
    if (status !== "all" && survey.status !== status) return false;
    if (!query) return true;
    return (
      survey.title.toLowerCase().includes(query) ||
      survey.slug.toLowerCase().includes(query)
    );
  });
}

export function sortSurveys(
  surveys: DashboardSurvey[],
  sort: DashboardSort,
): DashboardSurvey[] {
  const next = [...surveys];
  switch (sort) {
    case "created":
      next.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case "responses":
      next.sort((a, b) => b.realResponseCount - a.realResponseCount);
      break;
    case "title":
      next.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      next.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
  return next;
}
