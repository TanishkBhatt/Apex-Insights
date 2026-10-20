import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

function resolveBaseUrl(): string {
  const url = process.env.BETTER_AUTH_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

const baseURL = resolveBaseUrl();

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    transaction: true,
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Email delivery is not configured in this deployment, so verification is
    // disabled. See README for what is required to enable it.
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    changeEmail: { enabled: false },
    deleteUser: { enabled: false },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
    },
  },
  trustedOrigins: [baseURL],
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 30,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
