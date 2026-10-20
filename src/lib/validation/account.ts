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
