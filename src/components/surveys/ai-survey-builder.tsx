"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  FileText,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  createSurveyAction,
  generateSurveyDraftAction,
  type ActionState,
} from "@/app/dashboard/surveys/actions";
import type { AiSurveyDraft } from "@/lib/ai/survey";
import { Alert, Badge, Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import {
  QUESTION_TYPE_LABELS,
  type QuestionType,
} from "@/lib/validation/survey";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE =
  "Describe the survey you want to build — who it is for, what you want to learn, and roughly how long it should be. I will draft a fully editable survey that you can refine before saving.";

const EXAMPLES = [
  "Create a 6-question student wellbeing check-in for Year 10 pupils.",
  "Build a post-event feedback survey for a free community coding workshop.",
  "Design a short employee pulse survey about workload and manager support.",
];

function configSummary(
  type: QuestionType,
  config: AiSurveyDraft["questions"][number]["config"],
): string {
  switch (type) {
    case "single_choice":
    case "multiple_choice":
    case "dropdown":
    case "ranking":
      return (config.options ?? []).join(" · ");
    case "matrix": {
      const rows = config.rows ?? [];
      const columns = config.columns ?? [];
      return `${rows.length} row${rows.length === 1 ? "" : "s"} × ${columns.join(" / ")}`;
    }
    case "slider":
      return `${config.min ?? 0}–${config.max ?? 10}${
        config.minLabel || config.maxLabel
          ? ` (${config.minLabel || "Low"} → ${config.maxLabel || "High"})`
          : ""
      }`;
    case "number":
      return config.min !== undefined || config.max !== undefined
        ? `${config.min ?? "any"}–${config.max ?? "any"}`
        : "Number";
    case "rating":
      return `${config.icon ?? "star"} rating, 1–5`;
    case "nps":
      return "0–10 likelihood score";
    case "yes_no":
      return "Yes / No";
    case "email":
      return "Email address";
    case "short_text":
      return "Short free text";
    case "paragraph":
      return "Long free text";
    default:
      return "Answer";
  }
}

export function AiSurveyBuilder() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<AiSurveyDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<ActionState | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, generating]);

  function focusInput() {
    document.getElementById("ai-survey-prompt")?.focus();
  }

  function applyExample(example: string) {
    setInput(example);
    focusInput();
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || generating || saving) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setSaveResult(null);
    setGenerating(true);

    try {
      const result = await generateSurveyDraftAction({
        messages: nextMessages,
        currentDraft: draft,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(result.draft);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: result.message },
      ]);
    } catch {
      setError("Something went wrong while contacting Gemini. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    if (!draft || saving || generating) return;
    setSaveResult(null);
    setSaving(true);
    try {
      const result = await createSurveyAction({
        title: draft.title,
        description: draft.description ?? undefined,
        thankYouMessage: draft.thankYouMessage ?? undefined,
        questions: draft.questions,
      });
      setSaveResult(result);
      if (result.ok && result.surveyId) {
        router.push(`/dashboard/surveys/${result.surveyId}/edit`);
      }
    } catch {
      setSaveResult({
        ok: false,
        error: "Could not save the draft. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function startOver() {
    if (generating || saving) return;
    setMessages([{ role: "assistant", content: INITIAL_MESSAGE }]);
    setDraft(null);
    setInput("");
    setError(null);
    setSaveResult(null);
    focusInput();
  }

  const saveErrors =
    saveResult && !saveResult.ok ? saveResult.fieldErrors : undefined;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <Card className="overflow-hidden">
        <CardHeader
          title="Describe your survey"
          description="Chat with Gemini, then review and refine the draft before saving."
          actions={
            messages.length > 1 || draft ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={startOver}
                disabled={generating || saving}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Start over
              </Button>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          <div
            ref={scrollRef}
            className="max-h-[430px] space-y-3 overflow-y-auto pr-1"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    message.role === "user"
                      ? "rounded-br-md bg-indigo-600 text-white"
                      : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-700",
                  )}
                >
                  {message.role === "assistant" ? (
                    <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      Gemini
                    </span>
                  ) : null}
                  {message.content}
                </div>
              </div>
            ))}
            {generating ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Designing your survey…
                </div>
              </div>
            ) : null}
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          {messages.length === 1 && !draft ? (
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => applyExample(example)}
                  className="rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
                >
                  {example}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            className="space-y-3"
          >
            <label htmlFor="ai-survey-prompt" className="sr-only">
              Describe the survey
            </label>
            <Textarea
              id="ai-survey-prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              maxLength={4000}
              placeholder={
                draft
                  ? "Ask for a change, e.g. “Add a question about accessibility” or “Make it shorter”"
                  : "What do you want to learn? Who is the audience?"
              }
              disabled={generating || saving}
              className="min-h-24"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Enter to send · Shift + Enter for a new line
              </p>
              <Button type="submit" disabled={!input.trim() || generating || saving}>
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                {draft ? "Refine draft" : "Generate draft"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-4">
        {draft ? (
          <Card>
            <CardHeader
              title="Draft preview"
              description="Nothing is saved or published until you choose to save."
              actions={<Badge tone="violet">AI draft</Badge>}
            />
            <CardBody className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{draft.title}</h3>
                {draft.description ? (
                  <p className="mt-1 text-sm text-slate-600">{draft.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  {draft.questions.length} question
                  {draft.questions.length === 1 ? "" : "s"}
                  {draft.thankYouMessage ? " · thank-you message included" : ""}
                </p>
              </div>

              <ol className="space-y-2.5">
                {draft.questions.map((question, index) => (
                  <li
                    key={`${question.title}-${index}`}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {question.title}
                          {question.required ? (
                            <span className="ml-1 text-red-500" aria-label="Required">
                              *
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {QUESTION_TYPE_LABELS[question.type]} ·{" "}
                          {configSummary(question.type, question.config)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {draft.thankYouMessage ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <span className="font-medium">After submission:</span>{" "}
                  {draft.thankYouMessage}
                </div>
              ) : null}

              {saveResult && !saveResult.ok ? (
                <Alert tone="error">
                  <p>{saveResult.error}</p>
                  {saveErrors && Object.keys(saveErrors).length > 0 ? (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                      {Array.from(
                        new Set(
                          Object.values(saveErrors)
                            .flat()
                            .filter((message): message is string => Boolean(message)),
                        ),
                      )
                        .slice(0, 5)
                        .map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                    </ul>
                  ) : null}
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <Button onClick={saveDraft} disabled={saving || generating}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  {saving ? "Saving draft…" : "Save as draft"}
                </Button>
                <p className="text-xs text-slate-500">
                  Opens the full editor. Publishing stays a manual step.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Wand2 className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Your draft will appear here
                  </p>
                  <p className="mt-1 max-w-xs text-sm text-slate-500">
                    Describe an idea, review the generated questions, then ask Gemini to
                    refine them before saving.
                  </p>
                </div>
                <Link
                  href="/dashboard/surveys/new"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  Or start manually instead
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </CardBody>
          </Card>
        )}

        <Alert tone="info">
          AI drafts can make mistakes. Review every question, option and setting before
          publishing. You can edit everything in the normal survey editor.
        </Alert>
      </div>
    </div>
  );
}
