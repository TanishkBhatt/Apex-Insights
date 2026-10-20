"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  type PasswordActionState,
} from "@/app/dashboard/settings/actions";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    PasswordActionState,
    FormData
  >(changePasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Current password"
        htmlFor="current-password"
        error={state?.errors?.currentPassword?.[0]}
      >
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state?.errors?.currentPassword ? true : undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="New password"
          htmlFor="new-password"
          hint="8–128 characters."
          error={state?.errors?.newPassword?.[0]}
        >
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={state?.errors?.newPassword ? true : undefined}
          />
        </Field>
        <Field
          label="Confirm new password"
          htmlFor="confirm-password"
          error={state?.errors?.confirmPassword?.[0]}
        >
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={state?.errors?.confirmPassword ? true : undefined}
          />
        </Field>
      </div>

      {state?.message ? (
        <Alert tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
        <span className="text-xs text-slate-500">
          Updating your password signs out every other device.
        </span>
      </div>
    </form>
  );
}
