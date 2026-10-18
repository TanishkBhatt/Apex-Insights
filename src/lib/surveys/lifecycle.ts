import { randomBytes } from "node:crypto";
import type { SurveyStatus } from "@/db/schema";

/** Tiny opaque slug used for public survey links. */
export function generateSlug(byteLength = 9): string {
  return randomBytes(byteLength).toString("base64url");
}

const ALLOWED_TRANSITIONS: Record<SurveyStatus, SurveyStatus[]> = {
  draft: ["published"],
  published: ["closed"],
  closed: ["published"],
};

export function canTransition(from: SurveyStatus, to: SurveyStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isPubliclyAnswerable(status: SurveyStatus): boolean {
  return status === "published";
}

export function isEditable(status: SurveyStatus): boolean {
  return status === "draft" || status === "published" || status === "closed";
}
