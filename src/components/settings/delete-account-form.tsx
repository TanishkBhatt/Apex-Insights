"use client";

import { useActionState, useState } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import {
  deleteAccountAction,
  type DeleteActionState,
} from "@/app/dashboard/settings/actions";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<DeleteActionState, FormData>(
    deleteAccountAction,
    null,
  );
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <Alert tone="warning">
        <div className="flex gap-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">This cannot be undone.</p>
            <p className="mt-1">
              Deleting <span className="font-medium">{email}</span> permanently removes
              all of its surveys, responses, demo datasets and exports.
            </p>
          </div>
        </div>
      </Alert>

      <Field
        label="Password"
        htmlFor="delete-password"
        hint="Enter your current password to confirm."
      >
        <Input
          id="delete-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="confirm"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-red-600"
        />
        <span>
          I understand that my account and all of its data will be permanently
          deleted.
        </span>
      </label>

      {state?.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Button
        type="submit"
        variant="danger"
        disabled={pending || !password || !confirmed}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {pending ? "Deleting…" : "Delete account"}
      </Button>
    </form>
  );
}
