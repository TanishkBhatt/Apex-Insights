"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  QuestionField,
  type QuestionFieldData,
  type QuestionFieldValue,
} from "@/components/surveys/question-field";
import { validateAnswer } from "@/lib/validation/answers";

export type PublicSurvey = {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionFieldData[];
};

type FormState = Record<string, QuestionFieldValue>;

function isFilled(value: QuestionFieldValue): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

export function PublicSurveyForm({ survey, slug }: { survey: PublicSurvey; slug: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({});
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const answered = useMemo(
    () => survey.questions.filter((question) => isFilled(form[question.id])).length,
    [form, survey.questions],
  );
  const total = survey.questions.length;
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;

  function update(questionId: string, value: QuestionFieldValue) {
    setForm((prev) => ({ ...prev, [questionId]: value }));
    setFieldErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function scrollToQuestion(questionId: string) {
    requestAnimationFrame(() => {
      const element = document.getElementById(`public-question-${questionId}`);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element
        .querySelector<HTMLElement>("input, select, textarea, button")
        ?.focus({ preventScroll: true });
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    const answers: Array<{ questionId: string; value: unknown }> = [];

    for (const question of survey.questions) {
      const result = validateAnswer(
        {
          id: question.id,
          type: question.type,
          required: question.required,
          config: question.config,
        },
        form[question.id],
      );
      if (!result.ok) {
        nextErrors[question.id] = result.error;
        continue;
      }
      if (result.answered) {
        answers.push({ questionId: question.id, value: result.value });
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const first = survey.questions.find((question) => nextErrors[question.id]);
      if (first) scrollToQuestion(first.id);
      return;
    }

    setFieldErrors({});
    setPending(true);

    try {
      const response = await fetch(`/api/public/surveys/${slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (response.status === 404 || response.status === 403) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "This survey is not accepting responses.");
        return;
      }
      if (response.status === 429) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Too many submissions. Please wait a moment.");
        return;
      }
      if (response.status === 201) {
        setSuccess(true);
        router.push(`/survey/${slug}?thankyou=1`);
        return;
      }
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Your response could not be saved. Please review the form and try again.");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardBody className="space-y-3 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Thank you for your response</h2>
          <p className="text-sm text-slate-600">Your response has been recorded.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {answered} of {total} answered
          </span>
          <span>{progress}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Survey progress"
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <ol className="space-y-6">
        {survey.questions.map((question, index) => (
          <li
            key={question.id}
            id={`public-question-${question.id}`}
            className="space-y-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">
                {index + 1}. {question.title}
                {question.required ? (
                  <span className="ml-1 text-red-600" aria-label="required">
                    *
                  </span>
                ) : null}
              </p>
              {question.config.helpText ? (
                <p className="mt-1 text-xs text-slate-500">{question.config.helpText}</p>
              ) : null}
            </div>
            <QuestionField
              question={question}
              value={form[question.id]}
              onChange={(value) => update(question.id, value)}
              namePrefix="public"
              error={fieldErrors[question.id]}
            />
          </li>
        ))}
      </ol>

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Submitting…" : "Submit response"}
      </Button>
    </form>
  );
}
