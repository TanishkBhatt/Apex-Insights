"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  createSurvey,
  deleteSurvey,
  transitionSurveyStatus,
  updateSurvey,
  SurveyServiceError,
} from "@/lib/surveys/service";
import {
  surveyWithQuestionsSchema,
  demoGenerationSchema,
} from "@/lib/validation/survey";
import {
  generateSyntheticDataset,
  deleteDemoDatasetForOwner,
} from "@/lib/synthetic/generator";

export type ActionState =
  | { ok: true; surveyId?: string; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

function toFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

export async function createSurveyAction(payload: unknown): Promise<ActionState> {
  const user = await requireUser();

  const parsed = surveyWithQuestionsSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  try {
    const survey = await createSurvey(user.id, parsed.data);
    revalidatePath("/dashboard");
    return { ok: true, surveyId: survey.id, message: "Survey created." };
  } catch (error) {
    const message =
      error instanceof SurveyServiceError
        ? error.message
        : "Could not create the survey. Please try again.";
    return { ok: false, error: message };
  }
}

export async function updateSurveyAction(
  surveyId: string,
  payload: unknown,
): Promise<ActionState> {
  const user = await requireUser();

  if (typeof surveyId !== "string" || !/^[0-9a-f-]{36}$/i.test(surveyId)) {
    return { ok: false, error: "Invalid survey." };
  }

  const parsed = surveyWithQuestionsSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  try {
    const survey = await updateSurvey(user.id, surveyId, parsed.data);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/surveys/${surveyId}/edit`);
    revalidatePath(`/dashboard/surveys/${surveyId}/preview`);
    return { ok: true, surveyId: survey.id, message: "Changes saved." };
  } catch (error) {
    const message =
      error instanceof SurveyServiceError
        ? error.message
        : "Could not save changes. Please try again.";
    return { ok: false, error: message };
  }
}

export async function deleteSurveyAction(surveyId: string): Promise<ActionState> {
  const user = await requireUser();
  if (typeof surveyId !== "string") return { ok: false, error: "Invalid survey." };

  try {
    const deleted = await deleteSurvey(user.id, surveyId);
    if (!deleted) return { ok: false, error: "Survey not found." };
    revalidatePath("/dashboard");
    return { ok: true, message: "Survey deleted." };
  } catch {
    return { ok: false, error: "Could not delete the survey. Please try again." };
  }
}

export async function setSurveyStatusAction(
  surveyId: string,
  status: "published" | "closed",
): Promise<ActionState> {
  const user = await requireUser();
  if (typeof surveyId !== "string") return { ok: false, error: "Invalid survey." };
  if (status !== "published" && status !== "closed") {
    return { ok: false, error: "Invalid status." };
  }

  try {
    await transitionSurveyStatus(user.id, surveyId, status);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/surveys/${surveyId}/edit`);
    revalidatePath(`/dashboard/surveys/${surveyId}/preview`);
    return {
      ok: true,
      message: status === "published" ? "Survey published." : "Survey closed.",
    };
  } catch (error) {
    const message =
      error instanceof SurveyServiceError
        ? error.message
        : "Could not update the survey status.";
    return { ok: false, error: message };
  }
}

export async function generateDemoDataAction(
  surveyId: string,
  payload: unknown,
): Promise<ActionState> {
  const user = await requireUser();
  if (typeof surveyId !== "string" || !/^[0-9a-f-]{36}$/i.test(surveyId)) {
    return { ok: false, error: "Invalid survey." };
  }

  const parsed = demoGenerationSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  try {
    const seed =
      parsed.data.seed ||
      `demo-${surveyId.slice(0, 8)}-${parsed.data.count}`;
    await generateSyntheticDataset(user.id, surveyId, seed, parsed.data.count);
    revalidatePath(`/dashboard/surveys/${surveyId}/demo-data`);
    revalidatePath(`/dashboard/surveys/${surveyId}/analytics`);
    return {
      ok: true,
      message: `Generated ${parsed.data.count} demo response${parsed.data.count === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    const message =
      error instanceof SurveyServiceError
        ? error.message
        : "Could not generate demo data. Please try again.";
    return { ok: false, error: message };
  }
}

export async function deleteDemoDataAction(surveyId: string): Promise<ActionState> {
  const user = await requireUser();
  if (typeof surveyId !== "string" || !/^[0-9a-f-]{36}$/i.test(surveyId)) {
    return { ok: false, error: "Invalid survey." };
  }

  try {
    const deleted = await deleteDemoDatasetForOwner(user.id, surveyId);
    if (!deleted) return { ok: false, error: "No demo dataset found." };
    revalidatePath(`/dashboard/surveys/${surveyId}/demo-data`);
    revalidatePath(`/dashboard/surveys/${surveyId}/analytics`);
    return { ok: true, message: "Demo data removed." };
  } catch {
    return { ok: false, error: "Could not remove demo data. Please try again." };
  }
}
