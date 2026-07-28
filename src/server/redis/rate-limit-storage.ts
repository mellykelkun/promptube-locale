import "server-only";

import type { BetterAuthRateLimitStorage } from "@better-auth/core";

import { getRedisClient, REDIS_KEY_PREFIX } from "@/server/redis/client";

type RateLimitValue = {
  count: number;
  key: string;
  lastRequest: number;
};

const rateLimitPrefix = `${REDIS_KEY_PREFIX}rate-limit:`;

function buildKey(key: string): string {
  return `${rateLimitPrefix}${encodeURIComponent(key)}`;
}

export const redisRateLimitStorage: BetterAuthRateLimitStorage = {
  async get(key) {
    const redis = await getRedisClient();
    const value = await redis.get(buildKey(key));

    if (!value) {
      return null;
    }

    return JSON.parse(value) as RateLimitValue;
  },

  async set(key, value) {
    const redis = await getRedisClient();
    await redis.set(buildKey(key), JSON.stringify(value), { EX: 15 * 60 });
  },

  async consume(key, rule) {
    const redis = await getRedisClient();
    const redisKey = buildKey(key);
    const count = await redis.incr(redisKey);

    if (count === 1) {
      await redis.expire(redisKey, rule.window);
    }

    if (count > rule.max) {
      const ttl = await redis.ttl(redisKey);
      return {
        allowed: false,
        retryAfter: ttl > 0 ? ttl : rule.window,
      };
    }

    return {
      allowed: true,
      retryAfter: null,
    };
  },
};
