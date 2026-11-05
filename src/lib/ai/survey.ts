import type { QuestionConfig } from "@/db/schema";
import type { AiSurveyRequest } from "@/lib/validation/survey";
import {
  aiSurveyResponseSchema,
  LIMITS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/validation/survey";
import { generateGeminiJson } from "./gemini";

export type AiSurveyDraft = {
  title: string;
  description: string | null;
  thankYouMessage: string | null;
  questions: Array<{
    type: QuestionType;
    title: string;
    required: boolean;
    config: QuestionConfig;
  }>;
};

export type AiSurveyGenerationResult = {
  message: string;
  draft: AiSurveyDraft;
};

const TYPE_GUIDE = `Question type reference (use these exact type names):
- short_text, paragraph, email: config may include {"placeholder":"...","helpText":"..."}.
- single_choice, multiple_choice, dropdown: config must include {"options":["...","..."]} (2-50 unique options). Optionally include allowOther (only single_choice/multiple_choice), shuffleOptions and helpText.
- ranking: config must include {"options":["...","..."]} (2-50 unique items) and may include helpText.
- matrix: config must include {"rows":["..."],"columns":["...","..."]} (1-20 rows, 2-10 columns, unique labels) and may include helpText.
- slider: config must include numeric min and max (-1000 to 1000, max at least 1 greater than min and span at most 2000) and step (positive). Optional minLabel, maxLabel, helpText.
- number: config may include numeric min, max, step, placeholder and helpText.
- rating: config may include {"icon":"star"|"heart"|"thumb","helpText":"..."}.
- nps: config may only include helpText.
- yes_no: config may only include helpText.
- linear_scale is legacy and must not be generated.

Hard limits:
- title <= ${LIMITS.surveyTitleMax} characters; description <= ${LIMITS.surveyDescriptionMax}; thankYouMessage <= ${LIMITS.surveyThankYouMax}.
- question title <= ${LIMITS.questionTitleMax}; help text <= ${LIMITS.questionHelpMax}; options <= ${LIMITS.optionsMax} and <= ${LIMITS.optionLengthMax} characters each.
- 1-${LIMITS.questionMax} questions.`;

export function buildSurveyPrompt(request: AiSurveyRequest): string {
  const conversation = request.messages
    .map((message) => `${message.role === "user" ? "USER" : "ASSISTANT"}: ${message.content}`)
    .join("\n\n");

  return `Create or refine a survey based on the conversation below.

${conversation}

${
  request.currentDraft
    ? `The current survey draft is:
${JSON.stringify(request.currentDraft, null, 2)}

Apply the user's latest request to this draft. Preserve all existing questions, wording and settings unless the user explicitly asks to change them. You may add, remove, reorder or rewrite questions when requested.`
    : "There is no draft yet. Create a complete, focused survey that matches the user's goal."
}

${TYPE_GUIDE}

Design rules:
- Choose the most appropriate question types. Prefer a concise survey (usually 3-10 questions) unless the user asks for more.
- Write clear, neutral, respondent-friendly question text and a brief description.
- Use matrices only when several statements share the same rating scale.
- Use ranking only when the user genuinely needs an ordered list.
- Avoid duplicate options and contradictory questions.
- Do not include IDs, status, timestamps, response limits, publication state, HTML or markdown.
- The generated survey is only a draft. It must be safe for a human to review and edit before publishing.

Return strict JSON with exactly this shape:
{
  "message": "A short reply explaining what you created or changed.",
  "survey": {
    "title": "Survey title",
    "description": "Short description",
    "thankYouMessage": "Optional thank-you message",
    "questions": [
      {
        "type": "${QUESTION_TYPES.join('" | "')}",
        "title": "Question text",
        "required": true,
        "config": {}
      }
    ]
  }
}`;
}

export function validateAiSurveyResponse(value: unknown): AiSurveyGenerationResult {
  const parsed = aiSurveyResponseSchema.parse(value);
  return {
    message: parsed.message,
    draft: {
      title: parsed.survey.title,
      description: parsed.survey.description,
      thankYouMessage: parsed.survey.thankYouMessage,
      questions: parsed.survey.questions.map((question) => ({
        type: question.type,
        title: question.title,
        required: question.required,
        config: question.config,
      })),
    },
  };
}

export async function generateSurveyDraft(
  request: AiSurveyRequest,
): Promise<AiSurveyGenerationResult> {
  return generateGeminiJson({
    systemInstruction:
      "You are a senior survey designer. You turn a user's research goal into a concise, valid survey and refine it conversationally. Output strict JSON only. Never publish or imply that the draft is published.",
    prompt: buildSurveyPrompt(request),
    validate: validateAiSurveyResponse,
    temperature: 0.8,
    maxOutputTokens: 8192,
  });
}

export const AI_QUESTION_TYPE_LABELS = QUESTION_TYPES.map((type) => ({
  type,
  label: QUESTION_TYPE_LABELS[type],
}));
