import type { QuestionConfig } from "@/db/schema";
import { defaultConfigFor, type QuestionType } from "@/lib/validation/survey";

export type EditorQuestion = {
  id?: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options: string[];
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  placeholder: string;
};

export type EditorSurvey = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published" | "closed";
  questions: EditorQuestion[];
};

export function emptyQuestion(type: QuestionType): EditorQuestion {
  const config = defaultConfigFor(type);
  return {
    type,
    title: "",
    required: false,
    options: config.options ?? [],
    min: config.min ?? 1,
    max: config.max ?? 5,
    minLabel: config.minLabel ?? "",
    maxLabel: config.maxLabel ?? "",
    placeholder: config.placeholder ?? "",
  };
}

export function surveyToEditor(survey: {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "closed";
  questions: Array<{
    id: string;
    type: QuestionType;
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
    questions: survey.questions.map((question) => ({
      id: question.id,
      type: question.type,
      title: question.title,
      required: question.required,
      options: question.config.options ?? [],
      min: question.config.min ?? 1,
      max: question.config.max ?? 5,
      minLabel: question.config.minLabel ?? "",
      maxLabel: question.config.maxLabel ?? "",
      placeholder: question.config.placeholder ?? "",
    })),
  };
}

export const CHOICE_QUESTION_TYPES: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
];
