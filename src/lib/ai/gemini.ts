import { GoogleGenAI } from "@google/genai";
import { AiConfigurationError, AiGenerationError } from "./errors";

const DEFAULT_MODEL = "gemini-3.6-flash";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_API_ATTEMPTS = 3;
const MAX_OUTPUT_ATTEMPTS = 2;

let client: GoogleGenAI | null = null;
let clientApiKey: string | null = null;

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiConfigurationError(
      "AI features are not configured. Add GEMINI_API_KEY to the environment.",
    );
  }
  if (!client || clientApiKey !== apiKey) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    });
    clientApiKey = apiKey;
  }
  return client;
}

function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as { status?: unknown }).status;
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

function isRetryable(status: number | undefined): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function userMessageForError(error: unknown): string {
  const status = statusOf(error);
  if (status === 401 || status === 403) {
    return "Gemini rejected the API key. Check GEMINI_API_KEY and try again.";
  }
  if (status === 404) {
    return `The configured Gemini model (${getGeminiModel()}) is unavailable. Set GEMINI_MODEL to a supported model.`;
  }
  if (status === 429) {
    return "Gemini's rate limit was reached. Wait a moment and try again.";
  }
  if (status === 400) {
    return "Gemini rejected the request. Shorten the prompt or try again.";
  }
  return "Gemini is temporarily unavailable. Please try again shortly.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(input: {
  systemInstruction: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
}): Promise<string> {
  const ai = getClient();
  const model = getGeminiModel();
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt < MAX_API_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: input.prompt,
        config: {
          systemInstruction: input.systemInstruction,
          responseMimeType: "application/json",
          temperature: input.temperature,
          maxOutputTokens: input.maxOutputTokens,
        },
      });
      const text = response.text?.trim();
      if (!text) {
        throw new AiGenerationError(
          "Gemini returned an empty response. Please try again.",
        );
      }
      return text;
    } catch (error) {
      if (error instanceof AiConfigurationError) throw error;
      lastStatus = statusOf(error);
      const hasAttemptsLeft = attempt < MAX_API_ATTEMPTS - 1;
      if (!hasAttemptsLeft || !isRetryable(lastStatus)) {
        throw new AiGenerationError(userMessageForError(error));
      }
      await sleep(750 * 2 ** attempt + Math.floor(Math.random() * 250));
    }
  }

  throw new AiGenerationError(userMessageForError({ status: lastStatus }));
}

function parseJsonText(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("The response was not valid JSON.");
  }
}

function validationMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 1200);
  }
  return "The response did not match the required structure.";
}

/**
 * Ask Gemini for a JSON document and validate it with the caller's parser.
 * One correction attempt is made when the model returns malformed or
 * semantically invalid data. API/configuration errors are never swallowed.
 */
export async function generateGeminiJson<T>(options: {
  systemInstruction: string;
  prompt: string;
  validate: (value: unknown) => T;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<T> {
  let feedback: string | null = null;

  for (let attempt = 0; attempt < MAX_OUTPUT_ATTEMPTS; attempt += 1) {
    const prompt = feedback
      ? `${options.prompt}\n\nYour previous response was invalid: ${feedback}\nReturn a corrected JSON response only.`
      : options.prompt;

    const text = await callGemini({
      systemInstruction: options.systemInstruction,
      prompt,
      temperature: options.temperature ?? 0.9,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
    });

    try {
      return options.validate(parseJsonText(text));
    } catch (error) {
      if (error instanceof AiConfigurationError) throw error;
      if (error instanceof AiGenerationError) throw error;
      feedback = validationMessage(error);
    }
  }

  throw new AiGenerationError(
    "Gemini returned invalid structured data. Please try again.",
  );
}
