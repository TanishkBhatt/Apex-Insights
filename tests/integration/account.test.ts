import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { withDbRetry } from "@/lib/db-retry";
import { account, session, surveys, user } from "@/db/schema";
import {
  deleteUserAccount,
  updateUserProfile,
  verifyAccountPassword,
} from "@/lib/account";

const userId = `test-settings-${randomUUID()}`;
const email = `${userId}@example.test`;
const password = "correct-horse-battery-8";

beforeAll(async () => {
  await withDbRetry(async () => {
    await db.insert(user).values({
      id: userId,
      name: "Settings Tester",
      email,
      emailVerified: true,
    });
    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(password),
    });
  });
});

afterAll(async () => {
  await withDbRetry(() => db.delete(user).where(eq(user.id, userId)));
});

describe("account settings service", () => {
  it("verifies the stored password", async () => {
    await expect(verifyAccountPassword(userId, password)).resolves.toBe(true);
    await expect(verifyAccountPassword(userId, "wrong-password")).resolves.toBe(
      false,
    );
  });

  it("returns false when no credential account exists", async () => {
    await expect(
      verifyAccountPassword(`ghost-${randomUUID()}`, password),
    ).resolves.toBe(false);
  });

  it("updates the username and avatar", async () => {
    const updated = await updateUserProfile(userId, {
      name: "Renamed Tester",
      image: "/avatars/avatar-3.png",
    });

    expect(updated).toMatchObject({
      id: userId,
      name: "Renamed Tester",
      image: "/avatars/avatar-3.png",
    });

    const [row] = await db.select().from(user).where(eq(user.id, userId));
    expect(row.name).toBe("Renamed Tester");
    expect(row.image).toBe("/avatars/avatar-3.png");
  });

  it("deletes the account and cascades sessions and surveys", async () => {
    const sessionId = randomUUID();
    await db.insert(session).values({
      id: sessionId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      userId,
    });

    const surveyId = randomUUID();
    await db.insert(surveys).values({
      id: surveyId,
      ownerId: userId,
      title: "Cascade test",
      slug: randomUUID().slice(0, 12),
    });

    await expect(deleteUserAccount(userId)).resolves.toBe(true);

    const remainingUsers = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));
    const remainingSessions = await db
      .select()
      .from(session)
      .where(eq(session.userId, userId));
    const remainingSurveys = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, surveyId));

    expect(remainingUsers).toHaveLength(0);
    expect(remainingSessions).toHaveLength(0);
    expect(remainingSurveys).toHaveLength(0);
  });
});
