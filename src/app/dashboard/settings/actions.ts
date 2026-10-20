"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteUserAccount,
  updateUserProfile,
  verifyAccountPassword,
} from "@/lib/account";
import { requireUser } from "@/lib/session";
import { profileSchema } from "@/lib/validation/account";

export type ProfileActionState = {
  status: "success" | "error";
  message: string;
  errors?: { name?: string[]; avatar?: string[] };
} | null;

export type DeleteActionState = {
  status: "error";
  message: string;
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
