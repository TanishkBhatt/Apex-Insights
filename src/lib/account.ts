import { and, eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, user } from "@/db/schema";

export async function verifyAccountPassword(
  userId: string,
  password: string,
): Promise<boolean> {
  const [credential] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  if (!credential?.password) return false;

  try {
    return await verifyPassword({ hash: credential.password, password });
  } catch {
    return false;
  }
}

export async function updateUserProfile(
  userId: string,
  input: { name: string; image: string },
) {
  const [updated] = await db
    .update(user)
    .set({ name: input.name, image: input.image, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id, name: user.name, image: user.image });

  return updated ?? null;
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  const deleted = await db
    .delete(user)
    .where(eq(user.id, userId))
    .returning({ id: user.id });

  return deleted.length > 0;
}
