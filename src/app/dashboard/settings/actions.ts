"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteUserAccount,
  updateUserProfile,
  verifyAccountPassword,
} from "@/lib/account";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { changePasswordSchema, profileSchema } from "@/lib/validation/account";

export type ProfileActionState = {
  status: "success" | "error";
  message: string;
  errors?: { name?: string[]; avatar?: string[] };
} | null;

export type DeleteActionState = {
  status: "error";
  message: string;
} | null;

export type PasswordActionState = {
  status: "success" | "error";
  message: string;
  errors?: {
    currentPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
  };
} | null;

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const current = await requireUser();

  const parsed = profileSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    avatar: String(formData.get("avatar") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const updated = await updateUserProfile(current.id, {
    name: parsed.data.name,
    image: parsed.data.avatar,
  });
  if (!updated) {
    return {
      status: "error",
      message: "Your profile could not be updated. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  return { status: "success", message: "Profile updated successfully." };
}

export async function changePasswordAction(
  _prev: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const current = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!(await verifyAccountPassword(current.id, parsed.data.currentPassword))) {
    return {
      status: "error",
      message: "Your current password is incorrect.",
      errors: { currentPassword: ["Current password is incorrect."] },
    };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    return {
      status: "error",
      message: "Your password could not be changed. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return {
    status: "success",
    message: "Password updated. Other sessions have been signed out.",
  };
}

export async function deleteAccountAction(
  _prev: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
  const current = await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirmed = formData.get("confirm") === "on";

  if (!confirmed) {
    return {
      status: "error",
      message: "Tick the confirmation checkbox to delete your account.",
    };
  }

  if (!password) {
    return { status: "error", message: "Enter your password to confirm." };
  }

  if (!(await verifyAccountPassword(current.id, password))) {
    return {
      status: "error",
      message: "Incorrect password. Your account was not deleted.",
    };
  }

  if (!(await deleteUserAccount(current.id))) {
    return {
      status: "error",
      message: "Your account could not be deleted. Please try again.",
    };
  }

  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.includes("better-auth")) continue;
    cookieStore.delete({
      name: cookie.name,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
    });
  }

  redirect("/?account=deleted");
}
