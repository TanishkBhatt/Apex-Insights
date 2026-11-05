"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { LIMITS } from "@/lib/validation/survey";
import type { ActionState } from "@/app/dashboard/surveys/actions";
import { deleteDemoDataAction, generateDemoDataAction } from "@/app/dashboard/surveys/actions";

export function DemoDataPanel({
  surveyId,
  hasDataset,
}: {
  surveyId: string;
  hasDataset: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState<string>("50");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, setPending] = useState(false);

  async function onGenerate(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);
    setPending(true);
    try {
      const response = await generateDemoDataAction(surveyId, {
        count: Number(count),
        context: context.trim() || undefined,
      });
      setResult(response);
      if (response.ok) router.refresh();
    } catch {
      setResult({ ok: false, error: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        "Remove the demo dataset? Real responses are never affected by this action.",
      )
    ) {
      return;
    }
    setResult(null);
    setPending(true);
    try {
      const response = await deleteDemoDataAction(surveyId);
      setResult(response);
      if (response.ok) router.refresh();
    } catch {
      setResult({ ok: false, error: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader
        title="Demo data generator"
        description={
          hasDataset
            ? "Regenerating replaces the current demo dataset entirely. Real responses are never touched."
            : "Generate synthetic, clearly-separated demo responses to explore analytics."
        }
      />
      <CardBody className="space-y-4">
        {result ? (
          <Alert tone={result.ok ? "success" : "error"}>
            {result.ok ? result.message ?? "Done." : result.error}
          </Alert>
        ) : null}

        <form onSubmit={onGenerate} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Number of responses"
              htmlFor="demo-count"
              error={fieldErrors?.count?.[0] ?? null}
              hint={`${LIMITS.demoResponsesMin}–${LIMITS.demoAiResponsesMax} AI-generated responses`}
            >
              <Input
                id="demo-count"
                type="number"
                inputMode="numeric"
                min={LIMITS.demoResponsesMin}
                max={LIMITS.demoAiResponsesMax}
                value={count}
                onChange={(event) => setCount(event.target.value)}
                disabled={pending}
              />
            </Field>
            <Field
              label="Audience or scenario (optional)"
              htmlFor="demo-context"
              error={fieldErrors?.context?.[0] ?? null}
              hint="Give Gemini a persona, location, product or tone to keep respondents coherent."
            >
              <Textarea
                id="demo-context"
                className="min-h-20"
                maxLength={LIMITS.demoContextMax}
                placeholder="e.g. Year 10 students at a UK secondary school, mixed satisfaction"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                disabled={pending}
              />
            </Field>
          </div>

          <p className="text-xs text-slate-500">
            Gemini writes realistic answers using your exact question options and limits. Demo
            data remains separate from real responses, and a failed AI call never writes a
            partial dataset.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Gemini is generating…"
                : hasDataset
                  ? "Regenerate with AI"
                  : "Generate with AI"}
            </Button>
            {hasDataset ? (
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={pending}
              >
                Remove demo data
              </Button>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
