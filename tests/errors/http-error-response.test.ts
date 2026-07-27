import { describe, expect, it } from "vitest";

import { AppError } from "@/server/errors/app-error";
import { ERROR_CODES } from "@/server/errors/error-codes";
import { createSafeErrorResponse, toSafeHttpError } from "@/server/errors/http-error-response";

describe("HTTP error handling", () => {
  it("preserves the safe fields of an expected application error", () => {
    const error = new AppError({
      code: ERROR_CODES.INVALID_REQUEST,
      publicMessage: "La requête est invalide.",
      status: 400,
    });

    expect(toSafeHttpError(error)).toEqual({
      code: ERROR_CODES.INVALID_REQUEST,
      message: "La requête est invalide.",
      status: 400,
    });
  });

  it("hides unexpected messages and stack traces", async () => {
    const privateMessage = "database password leaked in stack";
    const response = createSafeErrorResponse(
      new Error(privateMessage),
      "correlation-test-123",
      new Date("2026-07-27T12:00:00.000Z"),
    );
    const body = await response.json();
    const serializedBody = JSON.stringify(body);

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      correlationId: "correlation-test-123",
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Une erreur interne est survenue.",
      },
      status: "error",
      timestamp: "2026-07-27T12:00:00.000Z",
    });
    expect(serializedBody).not.toContain(privateMessage);
    expect(serializedBody).not.toContain("stack");
  });
});
