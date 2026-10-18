"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
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
  const [count, setCount] = useState<string>("100");
  const [seed, setSeed] = useState("");
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, setPending] = useState(false);

  async function onGenerate(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);
    setPending(true);
    try {
      const response = await generateDemoDataAction(surveyId, {
        count: Number(count),
        seed: seed.trim() || undefined,
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
              hint={`${LIMITS.demoResponsesMin}–${LIMITS.demoResponsesMax}`}
            >
              <Input
                id="demo-count"
                type="number"
                inputMode="numeric"
                min={LIMITS.demoResponsesMin}
                max={LIMITS.demoResponsesMax}
                value={count}
                onChange={(event) => setCount(event.target.value)}
                disabled={pending}
              />
            </Field>
            <Field
              label="Seed (optional)"
              htmlFor="demo-seed"
              error={fieldErrors?.seed?.[0] ?? null}
              hint="Same seed + count produces identical data."
            >
              <Input
                id="demo-seed"
                type="text"
                maxLength={100}
                placeholder="e.g. spring-2026"
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                disabled={pending}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : hasDataset ? "Regenerate demo data" : "Generate demo data"}
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
