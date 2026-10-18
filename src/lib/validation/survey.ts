import { z } from "zod";

export const QUESTION_TYPES = [
  "short_text",
  "paragraph",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "linear_scale",
  "yes_no",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short text",
  paragraph: "Paragraph",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  dropdown: "Dropdown",
  linear_scale: "Linear scale",
  yes_no: "Yes / No",
};

export const CHOICE_TYPES: QuestionType[] = ["single_choice", "multiple_choice", "dropdown"];

export function isChoiceType(type: QuestionType): boolean {
  return CHOICE_TYPES.includes(type);
}

/** Limits applied to every write path (client and server). */
export const LIMITS = {
  surveyTitleMax: 300,
  surveyDescriptionMax: 2000,
  questionTitleMax: 500,
  questionMin: 1,
  questionMax: 100,
  optionsMin: 2,
  optionsMax: 50,
  optionLengthMax: 200,
  scaleMinMin: 0,
  scaleMinMax: 10,
  scaleMaxMin: 1,
  scaleMaxMax: 20,
  scaleSpanMax: 10,
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
  .max(LIMITS.optionLengthMax, `Options must be at most ${LIMITS.optionLengthMax} characters.`);

export const questionConfigSchema = z
  .object({
    options: z
      .array(optionSchema)
      .max(LIMITS.optionsMax, `At most ${LIMITS.optionsMax} options are allowed.`)
      .optional(),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
    minLabel: trimmed(LIMITS.scaleLabelMax).optional(),
    maxLabel: trimmed(LIMITS.scaleLabelMax).optional(),
    placeholder: trimmed(LIMITS.optionLengthMax).optional(),
  })
  .strict();

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

    if (isChoiceType(question.type)) {
      const options = config.options ?? [];
      if (options.length < LIMITS.optionsMin) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "options"],
          message: `Add at least ${LIMITS.optionsMin} options.`,
        });
      }
      const seen = new Set<string>();
      options.forEach((option, index) => {
        const key = option.toLowerCase();
        if (seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "options", index],
            message: "Options must be unique.",
          });
        }
        seen.add(key);
      });
      if (config.min !== undefined || config.max !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["config"],
          message: "Choice questions cannot define a scale range.",
        });
      }
    }

    if (question.type === "linear_scale") {
      const { min, max } = config;
      if (typeof min !== "number" || typeof max !== "number") {
        ctx.addIssue({
          code: "custom",
          path: ["config"],
          message: "Linear scale questions require a minimum and maximum.",
        });
        return;
      }
      if (min < LIMITS.scaleMinMin || min > LIMITS.scaleMinMax) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "min"],
          message: `Minimum must be between ${LIMITS.scaleMinMin} and ${LIMITS.scaleMinMax}.`,
        });
      }
      if (max < LIMITS.scaleMaxMin || max > LIMITS.scaleMaxMax) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "max"],
          message: `Maximum must be between ${LIMITS.scaleMaxMin} and ${LIMITS.scaleMaxMax}.`,
        });
      }
      if (max <= min) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "max"],
          message: "Maximum must be greater than minimum.",
        });
      } else if (max - min > LIMITS.scaleSpanMax) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "max"],
          message: `The scale can span at most ${LIMITS.scaleSpanMax} steps.`,
        });
      }
      if (config.options !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["config"],
          message: "Linear scale questions cannot define options.",
        });
      }
    }

    if (!isChoiceType(question.type) && question.type !== "linear_scale") {
      if (config.options !== undefined || config.min !== undefined || config.max !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["config"],
          message: "This question type does not accept options or a scale range.",
        });
      }
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

export const surveyInputSchema = z
  .object({
    title: trimmed(LIMITS.surveyTitleMax).min(1, "A survey title is required."),
    description: trimmed(LIMITS.surveyDescriptionMax).optional().transform((v) => (v ? v : null)),
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
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
} {
  switch (type) {
    case "single_choice":
    case "multiple_choice":
    case "dropdown":
      return { options: ["Option 1", "Option 2"] };
    case "linear_scale":
      return { min: 1, max: 5, minLabel: "Low", maxLabel: "High" };
    case "short_text":
      return { placeholder: "" };
    default:
      return {};
  }
}
