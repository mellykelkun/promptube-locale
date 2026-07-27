import "server-only";

import packageMetadata from "../../../package.json";
import { z } from "zod";

const environmentNameSchema = z.enum(["development", "test", "production"]);
const applicationVersionSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[0-9A-Za-z][0-9A-Za-z.+-]*$/);

const serverEnvironmentSchema = z.object({
  APP_ENV: environmentNameSchema.optional(),
  APP_VERSION: applicationVersionSchema.optional(),
  NODE_ENV: environmentNameSchema.optional(),
});

export type ServerEnvironment = Readonly<{
  environment: z.infer<typeof environmentNameSchema>;
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
    environment: result.data.APP_ENV ?? result.data.NODE_ENV ?? "development",
    version: result.data.APP_VERSION ?? packageMetadata.version,
  });
}

export const serverEnvironment = parseServerEnvironment({
  APP_ENV: process.env.APP_ENV,
  APP_VERSION: process.env.APP_VERSION,
  NODE_ENV: process.env.NODE_ENV,
});
