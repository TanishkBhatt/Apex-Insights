"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteResponseAction } from "@/app/dashboard/surveys/actions";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DeleteResponseButton({
  surveyId,
  responseId,
}: {
  surveyId: string;
  responseId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setPending(true);
    setError(null);
    try {
      const result = await deleteResponseAction(surveyId, responseId);
      if (result.ok) {
        router.push(`/dashboard/surveys/${surveyId}/responses`);
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Delete this response permanently?</span>
          <Button variant="danger" size="sm" onClick={onDelete} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            Yes, delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 className="h-4 w-4 text-red-600" aria-hidden />
          Delete response
        </Button>
      )}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
