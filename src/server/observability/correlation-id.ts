import "server-only";

import { randomUUID } from "node:crypto";

import { AppError } from "@/server/errors/app-error";
import { ERROR_CODES } from "@/server/errors/error-codes";
import { correlationIdSchema } from "@/shared/validation/correlation-id";

export function createCorrelationId(): string {
  return randomUUID();
}

export function resolveCorrelationId(value: string | null): string {
  if (value === null) {
    return createCorrelationId();
  }

  const result = correlationIdSchema.safeParse(value);

  if (!result.success) {
    throw new AppError({
      code: ERROR_CODES.INVALID_REQUEST,
      publicMessage: "La requête contient un identifiant de corrélation invalide.",
      status: 400,
    });
  }

  return result.data;
}
