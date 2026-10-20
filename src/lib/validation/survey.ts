import { z } from "zod";

export const QUESTION_TYPES = [
  "short_text",
  "paragraph",
  "number",
  "email",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "slider",
  "rating",
  "nps",
  "ranking",
  "matrix",
  "yes_no",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short text",
  paragraph: "Paragraph",
  number: "Number",
  email: "Email",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  dropdown: "Dropdown",
  slider: "Slider",
  rating: "Star rating",
  nps: "NPS (0–10)",
  ranking: "Ranking",
  matrix: "Likert matrix",
  yes_no: "Yes / No",
};

export const LEGACY_LINEAR_SCALE = "linear_scale";

export function questionTypeLabel(type: string): string {
  if (type === LEGACY_LINEAR_SCALE) return "Linear scale (legacy)";
  return QUESTION_TYPE_LABELS[type as QuestionType] ?? type;
}

export const CHOICE_TYPES: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
];

export const OTHER_CHOICE_TYPES: QuestionType[] = ["single_choice", "multiple_choice"];

export function isChoiceType(type: string): boolean {
  return CHOICE_TYPES.includes(type as QuestionType);
}

export function supportsOther(type: string): boolean {
  return OTHER_CHOICE_TYPES.includes(type as QuestionType);
}

/** Reserved prefix for the optional free-text "Other" choice. */
export const OTHER_PREFIX = "Other: ";

export function isOtherAnswerValue(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(OTHER_PREFIX);
}

/** Limits applied to every write path (client and server). */
export const LIMITS = {
  surveyTitleMax: 300,
  surveyDescriptionMax: 2000,
  surveyThankYouMax: 1000,
  surveyMaxResponsesMax: 100000,
  questionTitleMax: 500,
  questionHelpMax: 500,
  questionMin: 1,
  questionMax: 100,
  optionsMin: 2,
  optionsMax: 50,
  optionLengthMax: 200,
  otherAnswerMax: 200,
  sliderAbsMin: -1000,
  sliderAbsMax: 1000,
  sliderSpanMax: 2000,
  sliderStepMin: 0.01,
  ratingMin: 1,
  ratingMax: 5,
  npsMin: 0,
  npsMax: 10,
  numberAbsMin: -1_000_000_000,
  numberAbsMax: 1_000_000_000,
  numberStepMin: 0.000001,
  matrixRowsMin: 1,
  matrixRowsMax: 20,
  matrixColumnsMin: 2,
  matrixColumnsMax: 10,
  matrixLabelMax: 120,
  emailAnswerMax: 254,
  scaleLabelMax: 60,
  shortTextAnswerMax: 500,
  paragraphAnswerMax: 5000,
  cpuAnswersMax: 100,
  demoResponsesMin: 1,
  demoResponsesMax: 2000,
} as const;

const trimmed = (max: number) => z.string().trim().max(max);

export const surveyStatusSchema = z.enum(["draft", "published", "closed"]);
export type SurveyStatusInput = z.infer<typeof surveyStatusSchema>;

export const optionSchema = z
  .string()
  .trim()
  .min(1, "Option text cannot be empty.")
  .max(LIMITS.optionLengthMax, `Options must be at most ${LIMITS.optionLengthMax} characters.`)
  .refine(
    (value) => !value.toLowerCase().startsWith("other:"),
    'Options cannot start with "Other:".',
  );

export const matrixLabelSchema = z
  .string()
  .trim()
  .min(1, "Matrix labels cannot be empty.")
  .max(
    LIMITS.matrixLabelMax,
    `Matrix labels must be at most ${LIMITS.matrixLabelMax} characters.`,
  );

const positiveNumber = z.number().finite().positive().optional();

export const questionConfigSchema = z
  .object({
    options: z
      .array(optionSchema)
      .max(LIMITS.optionsMax, `At most ${LIMITS.optionsMax} options are allowed.`)
      .optional(),
    rows: z
      .array(matrixLabelSchema)
      .max(LIMITS.matrixRowsMax, `At most ${LIMITS.matrixRowsMax} rows are allowed.`)
      .optional(),
    columns: z
      .array(matrixLabelSchema)
      .max(LIMITS.matrixColumnsMax, `At most ${LIMITS.matrixColumnsMax} columns are allowed.`)
      .optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    step: positiveNumber,
    minLabel: trimmed(LIMITS.scaleLabelMax).optional(),
    maxLabel: trimmed(LIMITS.scaleLabelMax).optional(),
    placeholder: trimmed(LIMITS.optionLengthMax).optional(),
    helpText: trimmed(LIMITS.questionHelpMax).optional(),
    icon: z.enum(["star", "heart", "thumb"]).optional(),
    allowOther: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
  })
  .strict();

const CONFIG_KEYS = [
  "options",
  "rows",
  "columns",
  "min",
  "max",
  "step",
  "minLabel",
  "maxLabel",
  "placeholder",
  "helpText",
  "icon",
  "allowOther",
  "shuffleOptions",
] as const;

type ConfigKey = (typeof CONFIG_KEYS)[number];

function rejectConfigKeys(
  config: Record<string, unknown>,
  allowed: ConfigKey[],
  ctx: z.RefinementCtx,
  message: string,
) {
  for (const key of CONFIG_KEYS) {
    if (allowed.includes(key)) continue;
    if (config[key] !== undefined) {
      ctx.addIssue({ code: "custom", path: ["config", key], message });
    }
  }
}

function hasDuplicates(values: string[]): number[] {
  const seen = new Set<string>();
  const duplicates: number[] = [];
  values.forEach((value, index) => {
    const key = value.toLowerCase();
    if (seen.has(key)) duplicates.push(index);
    seen.add(key);
  });
  return duplicates;
}

export const questionInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    type: z.enum(QUESTION_TYPES),
    title: trimmed(LIMITS.questionTitleMax).min(1, "Question text is required."),
    required: z.boolean().default(false),
    config: questionConfigSchema.default({}),
  })
  .strict()
  .superRefine((question, ctx) => {
    const config = question.config;
    const type = question.type;

    if (isChoiceType(type)) {
      const options = config.options ?? [];
      if (options.length < LIMITS.optionsMin) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "options"],
          message: `Add at least ${LIMITS.optionsMin} options.`,
        });
      }
      for (const index of hasDuplicates(options)) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "options", index],
          message: "Options must be unique.",
        });
      }
      rejectConfigKeys(
        config,
        [
          "options",
          "helpText",
          "placeholder",
          "allowOther",
          "shuffleOptions",
        ],
        ctx,
        "This field is not valid for choice questions.",
      );
      if (config.allowOther && !supportsOther(type)) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "allowOther"],
          message: 'The "Other" option is only available for single and multiple choice.',
        });
      }
    }

    if (type === "slider") {
      const { min, max, step } = config;
      if (typeof min !== "number" || typeof max !== "number") {
        ctx.addIssue({
          code: "custom",
          path: ["config"],
          message: "Slider questions require a minimum and maximum.",
        });
        return;
      }
      if (min < LIMITS.sliderAbsMin || min > LIMITS.sliderAbsMax) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "min"],
          message: `Minimum must be between ${LIMITS.sliderAbsMin} and ${LIMITS.sliderAbsMax}.`,
        });
      }
      if (max < LIMITS.sliderAbsMin || max > LIMITS.sliderAbsMax) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "max"],
          message: `Maximum must be between ${LIMITS.sliderAbsMin} and ${LIMITS.sliderAbsMax}.`,
        });
      }
      if (max <= min) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "max"],
          message: "Maximum must be greater than minimum.",
        });
      } else if (max - min > LIMITS.sliderSpanMax) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "max"],
          message: `The slider can span at most ${LIMITS.sliderSpanMax}.`,
        });
      }
      if (step !== undefined) {
        if (step < LIMITS.sliderStepMin) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "step"],
            message: `Step must be at least ${LIMITS.sliderStepMin}.`,
          });
        } else if (max > min && step > max - min) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "step"],
            message: "Step cannot be larger than the slider range.",
          });
        }
      }
      rejectConfigKeys(
        config,
        ["min", "max", "step", "minLabel", "maxLabel", "helpText"],
        ctx,
        "This field is not valid for slider questions.",
      );
    }

    if (type === "rating") {
      rejectConfigKeys(
        config,
        ["icon", "helpText"],
        ctx,
        "Rating questions only support an icon and help text.",
      );
    }

    if (type === "nps") {
      rejectConfigKeys(
        config,
        ["helpText"],
        ctx,
        "NPS questions do not accept additional configuration.",
      );
    }

    if (type === "ranking") {
      const options = config.options ?? [];
      if (options.length < LIMITS.optionsMin) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "options"],
          message: `Add at least ${LIMITS.optionsMin} items to rank.`,
        });
      }
      for (const index of hasDuplicates(options)) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "options", index],
          message: "Ranking items must be unique.",
        });
      }
      rejectConfigKeys(
        config,
        ["options", "helpText"],
        ctx,
        "This field is not valid for ranking questions.",
      );
    }

    if (type === "matrix") {
      const rows = config.rows ?? [];
      const columns = config.columns ?? [];
      if (rows.length < LIMITS.matrixRowsMin) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "rows"],
          message: "Add at least one matrix row.",
        });
      }
      if (columns.length < LIMITS.matrixColumnsMin) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "columns"],
          message: `Add at least ${LIMITS.matrixColumnsMin} matrix columns.`,
        });
      }
      for (const index of hasDuplicates(rows)) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "rows", index],
          message: "Matrix rows must be unique.",
        });
      }
      for (const index of hasDuplicates(columns)) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "columns", index],
          message: "Matrix columns must be unique.",
        });
      }
      rejectConfigKeys(
        config,
        ["rows", "columns", "helpText"],
        ctx,
        "This field is not valid for matrix questions.",
      );
    }

    if (type === "number") {
      const { min, max, step } = config;
      if (min !== undefined && (min < LIMITS.numberAbsMin || min > LIMITS.numberAbsMax)) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "min"],
          message: `Minimum must be between ${LIMITS.numberAbsMin} and ${LIMITS.numberAbsMax}.`,
        });
      }
      if (max !== undefined && (max < LIMITS.numberAbsMin || max > LIMITS.numberAbsMax)) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "max"],
          message: `Maximum must be between ${LIMITS.numberAbsMin} and ${LIMITS.numberAbsMax}.`,
        });
      }
      if (min !== undefined && max !== undefined && max <= min) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "max"],
          message: "Maximum must be greater than minimum.",
        });
      }
      if (step !== undefined && step < LIMITS.numberStepMin) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "step"],
          message: `Step must be at least ${LIMITS.numberStepMin}.`,
        });
      }
      if (
        step !== undefined &&
        min !== undefined &&
        max !== undefined &&
        step > max - min
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "step"],
          message: "Step cannot be larger than the allowed range.",
        });
      }
      rejectConfigKeys(
        config,
        ["min", "max", "step", "placeholder", "helpText"],
        ctx,
        "This field is not valid for number questions.",
      );
    }

    if (type === "email") {
      rejectConfigKeys(
        config,
        ["placeholder", "helpText"],
        ctx,
        "Email questions only support a placeholder and help text.",
      );
    }

    if (type === "short_text" || type === "paragraph") {
      rejectConfigKeys(
        config,
        ["placeholder", "helpText"],
        ctx,
        "Text questions only support a placeholder and help text.",
      );
    }

    if (type === "yes_no") {
      rejectConfigKeys(
        config,
        ["helpText"],
        ctx,
        "Yes / No questions do not accept additional configuration.",
      );
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

const isoDate = z
  .union([z.date(), z.string().datetime({ offset: true })])
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    return value instanceof Date ? value : new Date(value);
  });

export const surveyInputSchema = z
  .object({
    title: trimmed(LIMITS.surveyTitleMax).min(1, "A survey title is required."),
    description: trimmed(LIMITS.surveyDescriptionMax)
      .optional()
      .transform((v) => (v ? v : null)),
    thankYouMessage: trimmed(LIMITS.surveyThankYouMax)
      .optional()
      .transform((v) => (v ? v : null)),
    closesAt: isoDate,
    maxResponses: z
      .number()
      .int()
      .min(1, "Response limit must be at least 1.")
      .max(LIMITS.surveyMaxResponsesMax)
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  .strict();

export type SurveyInput = z.infer<typeof surveyInputSchema>;

export const surveyWithQuestionsSchema = surveyInputSchema.extend({
  questions: z
    .array(questionInputSchema)
    .min(LIMITS.questionMin, "Add at least one question.")
    .max(LIMITS.questionMax, `Surveys support at most ${LIMITS.questionMax} questions.`),
});

export type SurveyWithQuestionsInput = z.infer<typeof surveyWithQuestionsSchema>;

export const demoGenerationSchema = z.object({
  count: z.coerce
    .number()
    .int()
    .min(LIMITS.demoResponsesMin)
    .max(LIMITS.demoResponsesMax),
  seed: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
});
export type DemoGenerationInput = z.infer<typeof demoGenerationSchema>;

export function defaultConfigFor(type: QuestionType): {
  options?: string[];
  rows?: string[];
  columns?: string[];
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  icon?: "star" | "heart" | "thumb";
} {
  switch (type) {
    case "single_choice":
    case "multiple_choice":
    case "dropdown":
      return { options: ["Option 1", "Option 2"] };
    case "ranking":
      return { options: ["Item 1", "Item 2", "Item 3"] };
    case "matrix":
      return {
        rows: ["Row 1", "Row 2"],
        columns: ["Poor", "Fair", "Good", "Excellent"],
      };
    case "slider":
      return { min: 0, max: 10, step: 1, minLabel: "Low", maxLabel: "High" };
    case "rating":
      return { icon: "star" };
    case "number":
      return { step: 1, placeholder: "" };
    case "short_text":
    case "email":
      return { placeholder: "" };
    default:
      return {};
  }
}
