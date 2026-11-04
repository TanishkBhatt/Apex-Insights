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

function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  ) {
    return true;
  }
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
}

/**
 * Keep the configured public origin trusted, and allow the local development
 * host or LAN address in the browser's Origin header. This prevents "Invalid
 * origin" when the app is opened through 127.0.0.1 or the machine's network IP
 * instead of the BETTER_AUTH_URL.
 */
function trustedOriginsForRequest(request?: Request): string[] {
  const origins = new Set<string>([baseURL]);

  for (const value of (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    const origin = value.trim().replace(/\/$/, "");
    if (origin) origins.add(origin);
  }

  const requestOrigin = request?.headers.get("origin");
  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin);
      if (
        (origin.protocol === "http:" || origin.protocol === "https:") &&
        isLocalOrPrivateHost(origin.hostname)
      ) {
        origins.add(origin.origin);
      }
    } catch {
      // Ignore malformed Origin headers; the allowlist check will reject them.
    }
  }

  return [...origins];
}

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
  trustedOrigins: trustedOriginsForRequest,
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 30,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
