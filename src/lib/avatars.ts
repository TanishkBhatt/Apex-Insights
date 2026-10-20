export const AVATARS = [
  { value: "/avatars/avatar-1.png", label: "Sunset" },
  { value: "/avatars/avatar-2.png", label: "Rose" },
  { value: "/avatars/avatar-3.png", label: "Mint" },
  { value: "/avatars/avatar-4.png", label: "Ocean" },
  { value: "/avatars/avatar-5.png", label: "Violet" },
  { value: "/avatars/avatar-6.png", label: "Gold" },
] as const;

export const DEFAULT_AVATAR = AVATARS[0].value;

export function resolveAvatar(image: string | null | undefined): string {
  if (image && AVATARS.some((avatar) => avatar.value === image)) return image;
  return DEFAULT_AVATAR;
}

export function isAvatarValue(value: string): boolean {
  return AVATARS.some((avatar) => avatar.value === value);
}
