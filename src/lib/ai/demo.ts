import { z } from "zod";
import type { Question } from "@/db/schema";
import type { AnswerValue } from "@/lib/validation/answers";
import { validateAnswer } from "@/lib/validation/answers";
import { LIMITS } from "@/lib/validation/survey";
import { generateGeminiJson, getGeminiModel } from "./gemini";

const MAX_CONCURRENT_BATCHES = 3;

export type GeneratedDemoAnswer = {
  questionId: string;
  value: AnswerValue;
};

export type GeneratedDemoResponse = {
  answers: GeneratedDemoAnswer[];
};

export type DemoGenerationResult = {
  responses: GeneratedDemoResponse[];
  model: string;
};

const demoBatchSchema = z
  .object({
    responses: z.array(
      z
        .object({
          answers: z.record(z.string(), z.unknown()),
        })
        .strict(),
    ),
  })
  .strict();

function formatConfig(question: Question): string {
  const config = question.config ?? {};
  switch (question.type) {
    case "single_choice":
    case "dropdown": {
      const other = config.allowOther
        ? ' You may instead use exactly one value like "Other: <short reason>".'
        : "";
      return `exactly one of ${JSON.stringify(config.options ?? [])}.${other}`;
    }
    case "multiple_choice": {
      const other = config.allowOther
        ? ' At most one selected value may be an "Other: <short reason>" entry.'
        : "";
      return `an array of 1-3 unique values from ${JSON.stringify(config.options ?? [])}.${other}`;
    }
    case "ranking":
      return `an array containing every one of ${JSON.stringify(
        config.options ?? [],
      )} exactly once`;
    case "matrix":
      return `an object with every one of these keys ${JSON.stringify(
        config.rows ?? [],
      )}; each value must be exactly one of ${JSON.stringify(config.columns ?? [])}`;
    case "slider": {
      const min = config.min ?? 0;
      const max = config.max ?? 10;
      const step = config.step ?? 1;
      return `a number from ${min} to ${max} that is a multiple of ${step}`;
    }
    case "number": {
      const parts = ["a finite number"];
      if (config.min !== undefined) parts.push(`at least ${config.min}`);
      if (config.max !== undefined) parts.push(`at most ${config.max}`);
      if (config.step !== undefined) parts.push(`a multiple of ${config.step}`);
      return parts.join(", ");
    }
    case "rating":
      return `an integer from ${LIMITS.ratingMin} to ${LIMITS.ratingMax}`;
    case "nps":
      return `an integer from ${LIMITS.npsMin} to ${LIMITS.npsMax}`;
    case "linear_scale":
      return `an integer from ${config.min ?? 1} to ${config.max ?? 5}`;
    case "yes_no":
      return "a boolean (true or false)";
    case "email":
      return 'a plausible unique email address ending in "@example.com"';
    case "short_text":
      return `a specific, realistic short answer of at most ${LIMITS.shortTextAnswerMax} characters`;
    case "paragraph":
      return `a specific, realistic paragraph of at most ${LIMITS.paragraphAnswerMax} characters`;
    default:
      return "a realistic value";
  }
}

function questionSpec(questions: Question[]): string {
  return questions
    .map(
      (question, index) =>
        `${index + 1}. id=${JSON.stringify(question.id)} | ${
          question.required ? "required" : "optional"
        } | ${question.type} | "${question.title}"\n   Value must be ${formatConfig(
          question,
        )}`,
    )
    .join("\n");
}

export function buildDemoPrompt(input: {
  surveyTitle: string;
  surveyDescription: string | null;
  context?: string;
  questions: Question[];
  count: number;
  batchIndex: number;
}): string {
  const context = input.context?.trim()
    ? input.context.trim()
    : "A broad, believable mix of respondents with varied perspectives.";
  return `Generate exactly ${input.count} synthetic survey responses for batch ${
    input.batchIndex + 1
  } of a demo dataset.

Survey title: ${JSON.stringify(input.surveyTitle)}
Survey description: ${JSON.stringify(input.surveyDescription ?? "")}
Audience / scenario supplied by the survey owner: ${JSON.stringify(context)}

Questions and exact value formats:
${questionSpec(input.questions)}

Rules:
- Give each response a distinct person's perspective. Vary sentiment, priorities and wording; do not copy the same answer pattern across responses.
- Answer every required question. Optional questions may be answered or omitted, but most should be answered for a useful demo.
- Use only the exact question IDs above. Do not invent or rename IDs.
- Choice values must match the configured option strings exactly. Do not add explanations outside the value.
- Rankings must include every configured item exactly once, with no duplicates.
- Matrix answers must include every configured row exactly once.
- Emails must use the reserved example.com domain. Never output real personal data.
- Text answers must be specific, natural and appropriate to the survey. Avoid lorem ipsum, placeholders, markdown and bullet lists.
- The data is explicitly synthetic and will be labelled as demo data in the UI.

Return JSON with this exact top-level shape:
{"responses":[{"answers":{"<question id>": <value>}}]}`;
}

export function validateDemoBatch(
  value: unknown,
  questions: Question[],
  expectedCount: number,
): GeneratedDemoResponse[] {
  const parsed = demoBatchSchema.parse(value);
  if (parsed.responses.length !== expectedCount) {
    throw new Error(
      `Expected exactly ${expectedCount} responses but received ${parsed.responses.length}.`,
    );
  }

  const knownIds = new Set(questions.map((question) => question.id));
  const errors: string[] = [];

  const responses = parsed.responses.map((response, responseIndex) => {
    const unknownIds = Object.keys(response.answers).filter((id) => !knownIds.has(id));
    if (unknownIds.length > 0) {
      throw new Error(
        `Response ${responseIndex + 1} contains unknown question IDs: ${unknownIds.join(
          ", ",
        )}.`,
      );
    }

    const answers: GeneratedDemoAnswer[] = [];
    for (const question of questions) {
      const raw = response.answers[question.id];
      const result = validateAnswer(question, raw);
      if (!result.ok) {
        errors.push(
          `Response ${responseIndex + 1}, question "${question.title}": ${result.error}`,
        );
        continue;
      }
      if (result.answered) {
        answers.push({ questionId: question.id, value: result.value as AnswerValue });
      }
    }
    return { answers };
  });

  if (errors.length > 0) {
    throw new Error(
      `Some generated answers are invalid:\n${errors.slice(0, 8).join("\n")}`,
    );
  }

  return responses;
}

function batchSizeFor(questionCount: number): number {
  return Math.max(5, Math.min(20, Math.floor(120 / Math.max(1, questionCount))));
}

async function generateBatch(input: {
  surveyTitle: string;
  surveyDescription: string | null;
  context?: string;
  questions: Question[];
  count: number;
  batchIndex: number;
}): Promise<GeneratedDemoResponse[]> {
  return generateGeminiJson({
    systemInstruction:
      "You generate realistic synthetic survey responses for a demo analytics dataset. You must output strict JSON and follow every configured constraint exactly.",
    prompt: buildDemoPrompt(input),
    validate: (value) => validateDemoBatch(value, input.questions, input.count),
    temperature: 1,
    maxOutputTokens: 16384,
  });
}

export async function generateDemoResponses(input: {
  surveyTitle: string;
  surveyDescription: string | null;
  context?: string;
  questions: Question[];
  count: number;
}): Promise<DemoGenerationResult> {
  if (input.questions.length === 0) {
    throw new Error("Add at least one question before generating demo data.");
  }

  const batchSize = batchSizeFor(input.questions.length);
  const batchCount = Math.ceil(input.count / batchSize);
  const results = new Array<GeneratedDemoResponse[]>(batchCount);
  let nextBatch = 0;

  async function worker() {
    while (nextBatch < batchCount) {
      const index = nextBatch;
      nextBatch += 1;
      const count = Math.min(batchSize, input.count - index * batchSize);
      results[index] = await generateBatch({
        surveyTitle: input.surveyTitle,
        surveyDescription: input.surveyDescription,
        context: input.context,
        questions: input.questions,
        count,
        batchIndex: index,
      });
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENT_BATCHES, batchCount) },
      () => worker(),
    ),
  );

  return {
    responses: results.flat(),
    model: getGeminiModel(),
  };
}
