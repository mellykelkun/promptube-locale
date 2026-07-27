import { serverEnvironment } from "@/server/config/environment";
import { AppError } from "@/server/errors/app-error";
import { ERROR_CODES } from "@/server/errors/error-codes";
import { createSafeErrorResponse } from "@/server/errors/http-error-response";
import { createCorrelationId, resolveCorrelationId } from "@/server/observability/correlation-id";
import { logger } from "@/server/observability/logger";
import { SERVICE_NAME } from "@/shared/constants/application";
import { healthQuerySchema } from "@/shared/validation/health-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Response {
  let correlationId = createCorrelationId();

  try {
    correlationId = resolveCorrelationId(request.headers.get("x-correlation-id"));

    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const queryResult = healthQuerySchema.safeParse(query);

    if (!queryResult.success) {
      throw new AppError({
        code: ERROR_CODES.INVALID_REQUEST,
        publicMessage: "La requête de healthcheck est invalide.",
        status: 400,
      });
    }

    const timestamp = new Date().toISOString();

    logger.info("Healthcheck completed", {
      context: {
        route: "/api/health",
        status: "ok",
      },
      correlationId,
    });

    return Response.json(
      {
        environment: serverEnvironment.environment,
        service: SERVICE_NAME,
        status: "ok",
        timestamp,
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
    logger.warn("Healthcheck request rejected", {
      context: {
        route: "/api/health",
      },
      correlationId,
      error,
    });

    return createSafeErrorResponse(error, correlationId);
  }
}
