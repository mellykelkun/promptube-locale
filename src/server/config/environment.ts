import "server-only";

import packageMetadata from "../../../package.json";
import { z } from "zod";

const applicationEnvironmentSchema = z.enum(["development", "local", "test", "production"]);
const nodeEnvironmentSchema = z.enum(["development", "test", "production"]);
const applicationVersionSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[0-9A-Za-z][0-9A-Za-z.+-]*$/);

const serverEnvironmentSchema = z.object({
  APP_ENV: applicationEnvironmentSchema.optional(),
  APP_VERSION: applicationVersionSchema.optional(),
  BETTER_AUTH_BASE_URL: z.url().optional(),
  BETTER_AUTH_SECRET_FILE: z.string().trim().min(1).optional(),
  NODE_ENV: nodeEnvironmentSchema.optional(),
  POSTGRES_APP_PASSWORD_FILE: z.string().trim().min(1).optional(),
  POSTGRES_DB: z.string().trim().min(1).optional(),
  POSTGRES_HOST: z.string().trim().min(1).optional(),
  POSTGRES_MIGRATION_PASSWORD_FILE: z.string().trim().min(1).optional(),
  POSTGRES_MIGRATION_USER: z.string().trim().min(1).optional(),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  POSTGRES_USER: z.string().trim().min(1).optional(),
  REDIS_HOST: z.string().trim().min(1).optional(),
  REDIS_PASSWORD_FILE: z.string().trim().min(1).optional(),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  TRUSTED_ORIGINS: z.string().trim().min(1).optional(),
});

export type ServerEnvironment = Readonly<{
  authBaseUrl: string;
  betterAuthSecretFile: string;
  environment: z.infer<typeof applicationEnvironmentSchema>;
  postgres: {
    appPasswordFile: string;
    database: string;
    host: string;
    migrationPasswordFile: string;
    migrationUser: string;
    port: number;
    user: string;
  };
  redis: {
    host: string;
    passwordFile: string;
    port: number;
  };
  trustedOrigins: string[];
  version: string;
}>;

export function parseServerEnvironment(
  input: Readonly<Record<string, string | undefined>>,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(input);

  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Invalid server environment configuration: ${fields.join(", ")}`);
  }

  return Object.freeze({
    authBaseUrl: result.data.BETTER_AUTH_BASE_URL ?? "http://127.0.0.1:8080",
    betterAuthSecretFile:
      result.data.BETTER_AUTH_SECRET_FILE ?? "/run/secrets/admin-promptube-better-auth-secret",
    environment: result.data.APP_ENV ?? result.data.NODE_ENV ?? "development",
    postgres: {
      appPasswordFile:
        result.data.POSTGRES_APP_PASSWORD_FILE ??
        "/run/secrets/admin-promptube-postgres-app-password",
      database: result.data.POSTGRES_DB ?? "promptube_admin",
      host: result.data.POSTGRES_HOST ?? "admin-promptube-postgres",
      migrationPasswordFile:
        result.data.POSTGRES_MIGRATION_PASSWORD_FILE ??
        "/run/secrets/admin-promptube-postgres-migration-password",
      migrationUser: result.data.POSTGRES_MIGRATION_USER ?? "promptube_admin_migration",
      port: result.data.POSTGRES_PORT ?? 5432,
      user: result.data.POSTGRES_USER ?? "promptube_admin_app",
    },
    redis: {
      host: result.data.REDIS_HOST ?? "admin-promptube-redis",
      passwordFile:
        result.data.REDIS_PASSWORD_FILE ?? "/run/secrets/admin-promptube-redis-password",
      port: result.data.REDIS_PORT ?? 6379,
    },
    trustedOrigins: (result.data.TRUSTED_ORIGINS ?? "http://127.0.0.1:8080")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    version: result.data.APP_VERSION ?? packageMetadata.version,
  });
}

export const serverEnvironment = parseServerEnvironment({
  APP_ENV: process.env.APP_ENV,
  APP_VERSION: process.env.APP_VERSION,
  BETTER_AUTH_BASE_URL: process.env.BETTER_AUTH_BASE_URL,
  BETTER_AUTH_SECRET_FILE: process.env.BETTER_AUTH_SECRET_FILE,
  NODE_ENV: process.env.NODE_ENV,
  POSTGRES_APP_PASSWORD_FILE: process.env.POSTGRES_APP_PASSWORD_FILE,
  POSTGRES_DB: process.env.POSTGRES_DB,
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_MIGRATION_PASSWORD_FILE: process.env.POSTGRES_MIGRATION_PASSWORD_FILE,
  POSTGRES_MIGRATION_USER: process.env.POSTGRES_MIGRATION_USER,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  POSTGRES_USER: process.env.POSTGRES_USER,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PASSWORD_FILE: process.env.REDIS_PASSWORD_FILE,
  REDIS_PORT: process.env.REDIS_PORT,
  TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
});
