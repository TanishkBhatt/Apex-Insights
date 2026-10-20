"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/app/dashboard/settings/actions";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AVATARS, resolveAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function ProfileForm({
  user,
}: {
  user: { name: string; email: string; image: string | null };
}) {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    null,
  );
  const [avatar, setAvatar] = useState(resolveAvatar(user.image));

  return (
    <form action={formAction} className="space-y-5">
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Profile icon</legend>
        <p className="mt-0.5 text-xs text-slate-500">
          Pick one of the six default avatars.
        </p>
        <div className="mt-3 grid max-w-md grid-cols-3 gap-3 sm:grid-cols-6">
          {AVATARS.map((option) => {
            const selected = avatar === option.value;
            return (
              <label
                key={option.value}
                className="group relative block cursor-pointer rounded-full"
              >
                <input
                  type="radio"
                  name="avatar"
                  value={option.value}
                  checked={selected}
                  onChange={() => setAvatar(option.value)}
                  className="peer sr-only"
                />
                <Image
                  src={option.value}
                  alt=""
                  width={192}
                  height={192}
                  className={cn(
                    "aspect-square w-full rounded-full object-cover ring-1 ring-slate-200 transition-transform group-hover:scale-105",
                    "peer-checked:ring-2 peer-checked:ring-indigo-600 peer-checked:ring-offset-2 peer-checked:ring-offset-surface",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600",
                  )}
                />
                <span className="pointer-events-none absolute right-0 bottom-0 hidden h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow peer-checked:flex">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                <span className="sr-only">{option.label}</span>
              </label>
            );
          })}
        </div>
        {state?.errors?.avatar ? (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {state.errors.avatar[0]}
          </p>
        ) : null}
      </fieldset>

      <Field
        label="Username"
        htmlFor="name"
        error={state?.errors?.name?.[0] ?? null}
        hint="This name appears in the dashboard header and across your surveys."
      >
        <Input
          id="name"
          name="name"
          defaultValue={user.name}
          autoComplete="name"
          maxLength={80}
          required
          aria-invalid={state?.errors?.name ? true : undefined}
        />
      </Field>

      <Field label="Email" htmlFor="email" hint="Email changes are not supported yet.">
        <Input id="email" name="email" defaultValue={user.email} disabled readOnly />
      </Field>

      {state?.message ? (
        <Alert tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
