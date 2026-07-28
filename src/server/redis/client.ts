import "server-only";

import { createClient, type RedisClientType } from "redis";

import { serverEnvironment } from "@/server/config/environment";
import { readDockerSecret } from "@/server/config/secrets";

let redisClientPromise: Promise<RedisClientType> | undefined;

export const REDIS_KEY_PREFIX =
  serverEnvironment.environment === "test" ? "promptube:test:" : "promptube:admin:";

async function createRedisConnection(): Promise<RedisClientType> {
  const password = await readDockerSecret(serverEnvironment.redis.passwordFile);
  const client = createClient({
    password,
    socket: {
      connectTimeout: 3_000,
      host: serverEnvironment.redis.host,
      port: serverEnvironment.redis.port,
      reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 100, 500)),
    },
  });

  client.on("error", () => {
    // The logger would add noise during startup; callers report readiness failures safely.
  });

  await client.connect();
  return client as RedisClientType;
}

export async function getRedisClient(): Promise<RedisClientType> {
  redisClientPromise ??= createRedisConnection();
  return redisClientPromise;
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClientPromise) {
    return;
  }

  const client = await redisClientPromise;
  redisClientPromise = undefined;
  await client.quit();
}
