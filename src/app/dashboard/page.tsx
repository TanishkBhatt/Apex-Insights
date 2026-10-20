import { DashboardBoard } from "@/components/dashboard/dashboard-board";
import { getDashboardActivity } from "@/lib/dashboard/activity";
import type { DashboardSurvey } from "@/lib/dashboard/filter";
import { listSurveysForOwner, publicSurveyUrl } from "@/lib/surveys/service";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [surveys, activity] = await Promise.all([
    listSurveysForOwner(user.id),
    getDashboardActivity(user.id),
  ]);

  const dashboardSurveys: DashboardSurvey[] = surveys.map((survey) => ({
    id: survey.id,
    title: survey.title,
    slug: survey.slug,
    status: survey.status,
    questionCount: survey.questionCount,
    realResponseCount: survey.realResponseCount,
    demoResponseCount: survey.demoResponseCount,
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
    publicUrl: publicSurveyUrl(survey.slug),
  }));

  return (
    <DashboardBoard
      userName={user.name}
      surveys={dashboardSurveys}
      activity={activity}
    />
  );
}
