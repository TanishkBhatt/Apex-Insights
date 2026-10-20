import { z } from "zod";
import { isAvatarValue } from "@/lib/avatars";

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters.")
    .max(80, "Username must be 80 characters or fewer."),
  avatar: z
    .string()
    .refine(isAvatarValue, "Choose one of the six default avatars."),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .max(128, "New password must be 128 characters or fewer."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });
