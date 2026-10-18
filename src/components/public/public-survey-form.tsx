"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuestionField, type QuestionFieldData, type QuestionFieldValue } from "@/components/surveys/question-field";

export type PublicSurvey = {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionFieldData[];
};

type FormState = Record<string, QuestionFieldValue>;

function toAnswerPayload(form: FormState, questions: QuestionFieldData[]) {
  const answers: Array<{ questionId: string; value: unknown }> = [];
  for (const question of questions) {
    const raw = form[question.id];
    if (raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
      continue;
    }
    answers.push({ questionId: question.id, value: raw });
  }
  return answers;
}

export function PublicSurveyForm({ survey, slug }: { survey: PublicSurvey; slug: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  function update(questionId: string, value: QuestionFieldValue) {
    setForm((prev) => ({ ...prev, [questionId]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const answers = toAnswerPayload(form, survey.questions);
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
        router.push(`/survey/${survey.id}?thankyou=1`);
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
      {error ? <Alert tone="error">{error}</Alert> : null}

      <ol className="space-y-6">
        {survey.questions.map((question, index) => (
          <li key={question.id} className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-800">
                {index + 1}. {question.title}
                {question.required ? (
                  <span className="ml-1 text-red-600" aria-label="required">
                    *
                  </span>
                ) : null}
              </p>
            </div>
            <QuestionField
              question={question}
              value={form[question.id]}
              onChange={(value) => update(question.id, value)}
              namePrefix="public"
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
