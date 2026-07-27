import "server-only";

import { AppError } from "@/server/errors/app-error";
import { ERROR_CODES, type ErrorCode } from "@/server/errors/error-codes";

export type SafeHttpError = Readonly<{
  code: ErrorCode;
  message: string;
  status: number;
}>;

export function toSafeHttpError(error: unknown): SafeHttpError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.publicMessage,
      status: error.status,
    };
  }

  return {
    code: ERROR_CODES.INTERNAL_ERROR,
    message: "Une erreur interne est survenue.",
    status: 500,
  };
}

export function createSafeErrorResponse(
  error: unknown,
  correlationId: string,
  now: Date = new Date(),
): Response {
  const safeError = toSafeHttpError(error);

  return Response.json(
    {
      error: {
        code: safeError.code,
        message: safeError.message,
      },
      correlationId,
      status: "error",
      timestamp: now.toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Correlation-ID": correlationId,
      },
      status: safeError.status,
    },
  );
}
