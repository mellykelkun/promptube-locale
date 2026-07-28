import { serverEnvironment } from "@/server/config/environment";
import { AppError } from "@/server/errors/app-error";
import { ERROR_CODES } from "@/server/errors/error-codes";
import { createSafeErrorResponse } from "@/server/errors/http-error-response";
import { createCorrelationId, resolveCorrelationId } from "@/server/observability/correlation-id";
import { logger } from "@/server/observability/logger";
import { SERVICE_NAME } from "@/shared/constants/application";
import { healthQuerySchema } from "@/shared/validation/health-request";

export function handleLiveness(request: Request): Response {
  let correlationId = createCorrelationId();

  try {
    correlationId = resolveCorrelationId(request.headers.get("x-correlation-id"));

    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const queryResult = healthQuerySchema.safeParse(query);

    if (!queryResult.success) {
      throw new AppError({
        code: ERROR_CODES.INVALID_REQUEST,
        publicMessage: "La requete de healthcheck est invalide.",
        status: 400,
      });
    }

    logger.info("Liveness healthcheck completed", {
      context: {
        route: "/api/health/live",
        status: "ok",
      },
      correlationId,
    });

    return Response.json(
      {
        environment: serverEnvironment.environment,
        service: SERVICE_NAME,
        status: "ok",
        timestamp: new Date().toISOString(),
        version: serverEnvironment.version,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Correlation-ID": correlationId,
        },
      },
    );
  } catch (error) {
    logger.warn("Liveness healthcheck rejected", {
      context: {
        route: "/api/health/live",
      },
      correlationId,
      error,
    });

    return createSafeErrorResponse(error, correlationId);
  }
}
