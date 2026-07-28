import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { serverEnvironment } from "@/server/config/environment";
import { readDockerSecret } from "@/server/config/secrets";
import * as schema from "@/server/database/schema";

let poolPromise: Promise<Pool> | undefined;

async function createPool(): Promise<Pool> {
  const password = await readDockerSecret(serverEnvironment.postgres.appPasswordFile);

  return new Pool({
    connectionTimeoutMillis: 3_000,
    database: serverEnvironment.postgres.database,
    host: serverEnvironment.postgres.host,
    idleTimeoutMillis: 30_000,
    max: 5,
    password,
    port: serverEnvironment.postgres.port,
    query_timeout: 5_000,
    user: serverEnvironment.postgres.user,
  });
}

export async function getPostgresPool(): Promise<Pool> {
  poolPromise ??= createPool();
  return poolPromise;
}

export async function getDatabase() {
  return drizzle(await getPostgresPool(), { schema });
}

export async function closeDatabasePool(): Promise<void> {
  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  poolPromise = undefined;
  await pool.end();
}
