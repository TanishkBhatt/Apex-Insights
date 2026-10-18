"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Lock, Send, Trash2 } from "lucide-react";
import {
  deleteSurveyAction,
  setSurveyStatusAction,
  type ActionState,
} from "@/app/dashboard/surveys/actions";
import { Alert, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SurveyStatus } from "@/db/schema";

const statusTone = {
  draft: "slate",
  published: "green",
  closed: "amber",
} as const;

const statusLabel = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
} as const;

export function StatusBadge({ status }: { status: SurveyStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>;
}

export function SurveyStatusBar({
  surveyId,
  status,
  publicUrl,
}: {
  surveyId: string;
  status: SurveyStatus;
  publicUrl: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"publish" | "close" | "delete" | null>(null);
  const [result, setResult] = useState<ActionState | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(action: "publish" | "close", fn: () => Promise<ActionState>) {
    setPending(action);
    setResult(null);
    try {
      const response = await fn();
      setResult(response);
      if (response.ok) router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />

        {status === "draft" ? (
          <Button
            size="sm"
            disabled={pending !== null}
            onClick={() => run("publish", () => setSurveyStatusAction(surveyId, "published"))}
          >
            {pending === "publish" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Publish
          </Button>
        ) : null}

        {status === "published" ? (
          <>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open public link
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publicUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setResult({ ok: false, error: "Could not copy the link." });
                }
              }}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending !== null}
              onClick={() => run("close", () => setSurveyStatusAction(surveyId, "closed"))}
            >
              {pending === "close" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Lock className="h-4 w-4" aria-hidden />
              )}
              Close survey
            </Button>
          </>
        ) : null}

        {status === "closed" ? (
          <Button
            size="sm"
            disabled={pending !== null}
            onClick={() => run("publish", () => setSurveyStatusAction(surveyId, "published"))}
          >
            {pending === "publish" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Reopen
          </Button>
        ) : null}

        <div className="ml-auto">
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Delete this survey?</span>
              <Button
                variant="danger"
                size="sm"
                disabled={pending !== null}
                onClick={async () => {
                  setPending("delete");
                  const response = await deleteSurveyAction(surveyId);
                  setPending(null);
                  if (response.ok) {
                    router.push("/dashboard");
                    router.refresh();
                  } else {
                    setResult(response);
                    setConfirmDelete(false);
                  }
                }}
              >
                Yes, delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 text-red-600" aria-hidden />
              Delete survey
            </Button>
          )}
        </div>
      </div>

      {status === "published" ? (
        <p className="break-all text-xs text-slate-500">Public URL: {publicUrl}</p>
      ) : null}

      {result && !result.ok ? <Alert tone="error">{result.error}</Alert> : null}
      {result && result.ok && result.message ? (
        <Alert tone="success">{result.message}</Alert>
      ) : null}
    </div>
  );
}
