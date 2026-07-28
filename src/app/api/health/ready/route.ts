import { serverEnvironment } from "@/server/config/environment";
import { getPostgresPool } from "@/server/database/client";
import { createCorrelationId, resolveCorrelationId } from "@/server/observability/correlation-id";
import { logger } from "@/server/observability/logger";
import { getRedisClient } from "@/server/redis/client";
import { SERVICE_NAME } from "@/shared/constants/application";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const correlationId =
    resolveCorrelationId(request.headers.get("x-correlation-id")) ?? createCorrelationId();

  try {
    const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);

    if (!postgres || !redis) {
      return unavailable(correlationId);
    }

    return Response.json(
      {
        dependencies: {
          postgres: "ok",
          redis: "ok",
        },
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
    logger.warn("Readiness healthcheck failed", {
      correlationId,
      error,
    });

    return unavailable(correlationId);
  }
}

async function checkPostgres(): Promise<boolean> {
  const pool = await getPostgresPool();
  await pool.query({
    text: "select 1",
  });
  return true;
}

async function checkRedis(): Promise<boolean> {
  const redis = await getRedisClient();
  return (await redis.ping()) === "PONG";
}

function unavailable(correlationId: string): Response {
  return Response.json(
    {
      dependencies: {
        postgres: "unavailable",
        redis: "unavailable",
      },
      environment: serverEnvironment.environment,
      service: SERVICE_NAME,
      status: "unavailable",
      timestamp: new Date().toISOString(),
      version: serverEnvironment.version,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Correlation-ID": correlationId,
      },
      status: 503,
    },
  );
}
