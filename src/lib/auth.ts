import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { createId } from "./id";
import { normalizeTimeZone } from "./timezone";

function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "build-time-placeholder-secret-not-used-at-runtime";
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  return "local-dev-secret-change-me-please-32";
}

export const auth = betterAuth({
  appName: "Personal Tracker",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  secret: getAuthSecret(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url, token }) => {
      if (process.env.NODE_ENV !== "production") {
        const appUrl =
          process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
        console.info(`[personal-tracker] Password reset link for ${user.email}: ${resetUrl}`);
        await db.insert(schema.devPasswordResetLinks).values({
          id: createId(),
          userId: user.id,
          email: user.email,
          token,
          url: resetUrl,
        });
      }
    },
  },
  databaseHooks: {
    session: {
      create: {
        async after(session, context) {
          const rawTimeZone = context?.request?.headers.get("x-client-timezone");
          if (!rawTimeZone || !session?.userId) return;
          const timeZone = normalizeTimeZone(rawTimeZone);
          await db
            .update(schema.user)
            .set({ timeZone, updatedAt: new Date() })
            .where(eq(schema.user.id, session.userId));
        },
      },
    },
  },
  plugins: [nextCookies()],
});
