import type { QuestionConfig, QuestionType } from "@/db/schema";
import {
  LIMITS,
  OTHER_PREFIX,
  isOtherAnswerValue,
  supportsOther,
} from "@/lib/validation/survey";

export type AnswerValue = string | number | boolean | string[] | Record<string, string>;

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

const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function isValidEmail(value: string): boolean {
  if (value.length > LIMITS.emailAnswerMax) return false;
  if (value.includes("..")) return false;
  if (!EMAIL_RE.test(value)) return false;
  const [local] = value.split("@");
  return Boolean(local) && !local.startsWith(".") && !local.endsWith(".");
}

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function isAligned(value: number, step: number): boolean {
  if (!Number.isFinite(step) || step <= 0) return false;
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-7;
}

function normalizeOther(value: string): string | null {
  if (!isOtherAnswerValue(value)) return null;
  const text = value.slice(OTHER_PREFIX.length).trim();
  if (!text || text.length > LIMITS.otherAnswerMax) return null;
  return `${OTHER_PREFIX}${text}`;
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

    case "email": {
      if (typeof rawValue !== "string") {
        return { ok: false, error: "Enter an email address." };
      }
      const value = rawValue.trim();
      if (!isValidEmail(value)) {
        return {
          ok: false,
          error: "Enter a valid email address, for example name@example.com.",
        };
      }
      return { ok: true, answered: true, value };
    }

    case "number": {
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        return { ok: false, error: "Enter a number." };
      }
      const value = Object.is(rawValue, -0) ? 0 : rawValue;
      if (config.min !== undefined && value < config.min) {
        return { ok: false, error: `Number must be at least ${config.min}.` };
      }
      if (config.max !== undefined && value > config.max) {
        return { ok: false, error: `Number must be at most ${config.max}.` };
      }
      if (config.step !== undefined && !isAligned(value, config.step)) {
        return { ok: false, error: `Number must be a multiple of ${config.step}.` };
      }
      return { ok: true, answered: true, value };
    }

    case "slider": {
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        return { ok: false, error: "Choose a value on the slider." };
      }
      const min = config.min ?? 0;
      const max = config.max ?? 10;
      const step = config.step ?? 1;
      if (rawValue < min || rawValue > max) {
        return { ok: false, error: `Value must be between ${min} and ${max}.` };
      }
      if (!isAligned(rawValue, step)) {
        return { ok: false, error: `Value must be a multiple of ${step}.` };
      }
      return { ok: true, answered: true, value: rawValue };
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

    case "rating": {
      if (
        typeof rawValue !== "number" ||
        !Number.isInteger(rawValue) ||
        rawValue < LIMITS.ratingMin ||
        rawValue > LIMITS.ratingMax
      ) {
        return {
          ok: false,
          error: `Choose a rating between ${LIMITS.ratingMin} and ${LIMITS.ratingMax}.`,
        };
      }
      return { ok: true, answered: true, value: rawValue };
    }

    case "nps": {
      if (
        typeof rawValue !== "number" ||
        !Number.isInteger(rawValue) ||
        rawValue < LIMITS.npsMin ||
        rawValue > LIMITS.npsMax
      ) {
        return { ok: false, error: "Choose a score from 0 to 10." };
      }
      return { ok: true, answered: true, value: rawValue };
    }

    case "ranking": {
      if (!Array.isArray(rawValue) || rawValue.some((item) => typeof item !== "string")) {
        return { ok: false, error: "Rank the available items." };
      }
      const options = config.options ?? [];
      const unique = Array.from(new Set(rawValue as string[]));
      if (unique.length !== rawValue.length) {
        return { ok: false, error: "Each item can only be ranked once." };
      }
      if (unique.length !== options.length || options.some((option) => !unique.includes(option))) {
        return { ok: false, error: "Rank every item before submitting." };
      }
      return { ok: true, answered: true, value: unique };
    }

    case "matrix": {
      if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
        return { ok: false, error: "Choose one option for each row." };
      }
      const rows = config.rows ?? [];
      const columns = config.columns ?? [];
      const record = rawValue as Record<string, unknown>;
      const normalized: Record<string, string> = {};
      for (const [row, column] of Object.entries(record)) {
        if (!rows.includes(row)) {
          return { ok: false, error: "The answer references an unknown matrix row." };
        }
        if (typeof column !== "string" || !columns.includes(column)) {
          return { ok: false, error: "Choose one of the available matrix options." };
        }
        normalized[row] = column;
      }
      if (question.required && Object.keys(normalized).length !== rows.length) {
        return { ok: false, error: "Choose an option for every row." };
      }
      return { ok: true, answered: true, value: normalized };
    }

    case "single_choice":
    case "dropdown": {
      if (typeof rawValue !== "string") {
        return { ok: false, error: "Select one of the available options." };
      }
      const options = config.options ?? [];
      const match = options.find((option) => option === rawValue);
      if (match) return { ok: true, answered: true, value: match };
      if (config.allowOther && supportsOther(question.type)) {
        const other = normalizeOther(rawValue);
        if (other) return { ok: true, answered: true, value: other };
      }
      return { ok: false, error: "Select one of the available options." };
    }

    case "multiple_choice": {
      if (!Array.isArray(rawValue) || rawValue.some((item) => typeof item !== "string")) {
        return { ok: false, error: "Select from the available options." };
      }
      const options = config.options ?? [];
      const unique = Array.from(new Set((rawValue as string[]).map((v) => v.trim())));
      if (unique.some((item) => !item)) {
        return { ok: false, error: "Selected options cannot be empty." };
      }
      const normalized: string[] = [];
      let otherCount = 0;
      for (const item of unique) {
        if (options.includes(item)) {
          normalized.push(item);
          continue;
        }
        if (config.allowOther && isOtherAnswerValue(item)) {
          const other = normalizeOther(item);
          if (!other) {
            return { ok: false, error: "Enter a value for the Other option." };
          }
          otherCount += 1;
          if (otherCount > 1) {
            return { ok: false, error: "Only one Other answer is allowed." };
          }
          normalized.push(other);
          continue;
        }
        return { ok: false, error: "One selected option is not part of this question." };
      }
      if (normalized.length === 0) {
        if (question.required) return { ok: false, error: "This question is required." };
        return { ok: true, answered: false };
      }
      return { ok: true, answered: true, value: normalized };
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
