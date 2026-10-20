import type { QuestionConfig } from "@/db/schema";
import { defaultConfigFor, type QuestionType } from "@/lib/validation/survey";

export type EditorQuestion = {
  id?: string;
  type: QuestionType;
  title: string;
  required: boolean;
  helpText: string;
  options: string[];
  rows: string[];
  columns: string[];
  min: string;
  max: string;
  step: string;
  minLabel: string;
  maxLabel: string;
  placeholder: string;
  icon: "star" | "heart" | "thumb";
  allowOther: boolean;
  shuffleOptions: boolean;
};

export type EditorSurvey = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published" | "closed";
  thankYouMessage: string;
  closesAt: string;
  maxResponses: string;
  questions: EditorQuestion[];
};

export type EditorDraft = Pick<EditorSurvey, "title" | "description" | "questions"> &
  Partial<Pick<EditorSurvey, "thankYouMessage" | "closesAt" | "maxResponses">>;

export function emptyQuestion(type: QuestionType): EditorQuestion {
  const config = defaultConfigFor(type);
  return {
    type,
    title: "",
    required: false,
    helpText: "",
    options: config.options ?? [],
    rows: config.rows ?? [],
    columns: config.columns ?? [],
    min: config.min !== undefined ? String(config.min) : "",
    max: config.max !== undefined ? String(config.max) : "",
    step: config.step !== undefined ? String(config.step) : "",
    minLabel: config.minLabel ?? "",
    maxLabel: config.maxLabel ?? "",
    placeholder: config.placeholder ?? "",
    icon: config.icon ?? "star",
    allowOther: false,
    shuffleOptions: false,
  };
}

function toLocalDateTimeInput(value: Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function surveyToEditor(survey: {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "closed";
  thankYouMessage: string | null;
  closesAt: Date | null;
  maxResponses: number | null;
  questions: Array<{
    id: string;
    type: QuestionType | string;
    title: string;
    required: boolean;
    config: QuestionConfig;
  }>;
}): EditorSurvey {
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description ?? "",
    status: survey.status,
    thankYouMessage: survey.thankYouMessage ?? "",
    closesAt: toLocalDateTimeInput(survey.closesAt),
    maxResponses: survey.maxResponses ? String(survey.maxResponses) : "",
    questions: survey.questions.map((question) => ({
      id: question.id,
      type: (question.type === "linear_scale" ? "slider" : question.type) as QuestionType,
      title: question.title,
      required: question.required,
      helpText: question.config.helpText ?? "",
      options: question.config.options ?? [],
      rows: question.config.rows ?? [],
      columns: question.config.columns ?? [],
      min:
        question.config.min !== undefined ? String(question.config.min) : "",
      max:
        question.config.max !== undefined ? String(question.config.max) : "",
      step:
        question.config.step !== undefined ? String(question.config.step) : "",
      minLabel: question.config.minLabel ?? "",
      maxLabel: question.config.maxLabel ?? "",
      placeholder: question.config.placeholder ?? "",
      icon: question.config.icon ?? "star",
      allowOther: question.config.allowOther ?? false,
      shuffleOptions: question.config.shuffleOptions ?? false,
    })),
  };
}

export const CHOICE_QUESTION_TYPES: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
];
