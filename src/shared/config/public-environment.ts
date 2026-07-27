import { z } from "zod";

import { DEFAULT_APPLICATION_NAME } from "@/shared/constants/application";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).max(80).default(DEFAULT_APPLICATION_NAME),
});

export type PublicEnvironment = Readonly<{
  applicationName: string;
}>;

export function parsePublicEnvironment(
  input: Readonly<Record<string, string | undefined>>,
): PublicEnvironment {
  const result = publicEnvironmentSchema.safeParse(input);

  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Invalid public environment configuration: ${fields.join(", ")}`);
  }

  return Object.freeze({
    applicationName: result.data.NEXT_PUBLIC_APP_NAME,
  });
}

export const publicEnvironment = parsePublicEnvironment({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
