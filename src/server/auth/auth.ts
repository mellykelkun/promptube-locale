import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";

import { serverEnvironment } from "@/server/config/environment";
import { readDockerSecret } from "@/server/config/secrets";
import { getDatabase } from "@/server/database/client";
import * as schema from "@/server/database/schema";
import { redisRateLimitStorage } from "@/server/redis/rate-limit-storage";

import { hashAdminPassword, verifyAdminPassword } from "./password";

let authPromise: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  authPromise ??= createAuth();
  return authPromise;
}

async function createAuth() {
  const secureCookies = !["local", "test"].includes(serverEnvironment.environment);
  const isTestEnvironment = serverEnvironment.environment === "test";
  const signInRateLimit = {
    max: isTestEnvironment ? 20 : 5,
    window: isTestEnvironment ? 10 : 15 * 60,
  };
  const totpRateLimit = {
    max: isTestEnvironment ? 10 : 5,
    window: isTestEnvironment ? 10 : 15 * 60,
  };

  if (secureCookies && !serverEnvironment.authBaseUrl.startsWith("https://")) {
    throw new Error(
      "Secure cookies require an HTTPS Better Auth base URL outside APP_ENV=local or APP_ENV=test.",
    );
  }

  const secret = await readDockerSecret(serverEnvironment.betterAuthSecretFile);
  const db = await getDatabase();

  return betterAuth({
    appName: "Promptube Admin",
    baseURL: serverEnvironment.authBaseUrl,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      autoSignIn: false,
      disableSignUp: true,
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 14,
      password: {
        hash: hashAdminPassword,
        verify: verifyAdminPassword,
      },
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [
      admin({
        adminRoles: ["admin"],
        defaultRole: "user",
      }),
      twoFactor({
        issuer: "Promptube Admin",
        skipVerificationOnEnable: false,
        trustDeviceMaxAge: 0,
        twoFactorCookieMaxAge: 600,
        accountLockout: {
          durationSeconds: 900,
          enabled: true,
          maxFailedAttempts: 5,
        },
      }),
      nextCookies(),
    ],
    rateLimit: {
      customRules: {
        "/sign-in/email": signInRateLimit,
        "/two-factor/verify-totp": totpRateLimit,
      },
      customStorage: redisRateLimitStorage,
      enabled: true,
      max: 100,
      window: 60,
    },
    secret,
    session: {
      cookieCache: {
        enabled: false,
      },
      expiresIn: 8 * 60 * 60,
      storeSessionInDatabase: true,
      updateAge: 30 * 60,
    },
    telemetry: {
      enabled: false,
    },
    trustedOrigins: serverEnvironment.trustedOrigins,
    user: {
      additionalFields: {
        twoFactorEnabled: {
          defaultValue: false,
          input: false,
          required: false,
          type: "boolean",
        },
      },
    },
    advanced: {
      cookiePrefix: "promptube-admin",
      defaultCookieAttributes: {
        httpOnly: true,
        path: "/",
        sameSite: "strict",
        secure: secureCookies,
      },
      disableCSRFCheck: false,
      disableOriginCheck: false,
      useSecureCookies: secureCookies,
    },
  });
}
