import type { QuestionConfig, QuestionType } from "@/db/schema";
import { LIMITS } from "@/lib/validation/survey";

export type AnswerValue = string | number | boolean | string[];

export type AnswerQuestion = {
  id: string;
  type: QuestionType;
  required: boolean;
  config: QuestionConfig;
};

export type AnswerValidationResult =
  | { ok: true; answered: false }
  | { ok: true; answered: true; value: AnswerValue }
  | { ok: false; error: string };

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Validate a single answer against its question. Values are stored exactly as
 * validated here, so historical answers always match their question shape.
 */
export function validateAnswer(
  question: AnswerQuestion,
  rawValue: unknown,
): AnswerValidationResult {
  const blank = isBlank(rawValue);

  if (blank) {
    if (question.required) {
      return { ok: false, error: "This question is required." };
    }
    return { ok: true, answered: false };
  }

  const config = question.config ?? {};

  switch (question.type) {
    case "short_text":
    case "paragraph": {
      if (typeof rawValue !== "string") {
        return { ok: false, error: "Expected text." };
      }
      const value = rawValue.trim();
      const max =
        question.type === "short_text"
          ? LIMITS.shortTextAnswerMax
          : LIMITS.paragraphAnswerMax;
      if (value.length > max) {
        return { ok: false, error: `Please use at most ${max} characters.` };
      }
      return { ok: true, answered: true, value };
    }

    case "single_choice":
    case "dropdown": {
      if (typeof rawValue !== "string") {
        return { ok: false, error: "Select one of the available options." };
      }
      const options = config.options ?? [];
      const match = options.find((option) => option === rawValue);
      if (!match) {
        return { ok: false, error: "Select one of the available options." };
      }
      return { ok: true, answered: true, value: match };
    }

    case "multiple_choice": {
      if (!Array.isArray(rawValue) || rawValue.some((item) => typeof item !== "string")) {
        return { ok: false, error: "Select from the available options." };
      }
      const options = config.options ?? [];
      const unique = Array.from(new Set(rawValue as string[]));
      if (unique.length > options.length) {
        return { ok: false, error: "Too many options selected." };
      }
      for (const item of unique) {
        if (!options.includes(item)) {
          return { ok: false, error: "One selected option is not part of this question." };
        }
      }
      if (unique.length === 0) {
        if (question.required) return { ok: false, error: "This question is required." };
        return { ok: true, answered: false };
      }
      return { ok: true, answered: true, value: unique };
    }

    case "linear_scale": {
      const min = config.min ?? 1;
      const max = config.max ?? 5;
      if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
        return { ok: false, error: "Select a value on the scale." };
      }
      if (rawValue < min || rawValue > max) {
        return { ok: false, error: `Value must be between ${min} and ${max}.` };
      }
      return { ok: true, answered: true, value: rawValue };
    }

    case "yes_no": {
      if (typeof rawValue === "boolean") {
        return { ok: true, answered: true, value: rawValue };
      }
      if (rawValue === "yes" || rawValue === "true") {
        return { ok: true, answered: true, value: true };
      }
      if (rawValue === "no" || rawValue === "false") {
        return { ok: true, answered: true, value: false };
      }
      return { ok: false, error: "Choose Yes or No." };
    }

    default:
      return { ok: false, error: "Unsupported question type." };
  }
}
