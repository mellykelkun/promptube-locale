import { readFile } from "node:fs/promises";

import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { expect, request as playwrightRequest, test } from "@playwright/test";
import pg from "pg";
import { createClient } from "redis";

const requiredEnvironment = [
  "PLAYWRIGHT_BASE_URL",
  "POSTGRES_APP_PASSWORD_FILE",
  "POSTGRES_DB",
  "POSTGRES_HOST",
  "POSTGRES_MIGRATION_PASSWORD_FILE",
  "POSTGRES_MIGRATION_USER",
  "POSTGRES_USER",
  "REDIS_HOST",
  "REDIS_PASSWORD_FILE",
  "TEST_ADMIN_EMAIL",
  "TEST_ADMIN_PASSWORD_FILE",
] as const;

function getRequiredEnvironment(name: (typeof requiredEnvironment)[number]): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing test environment: ${name}`);
  }
  return value;
}

async function readSecret(path: string): Promise<string> {
  const value = (await readFile(path, "utf8")).replace(/\r?\n$/, "");
  if (!value) {
    throw new Error("A required test secret is empty.");
  }
  return value;
}

async function createDatabaseClient(user: string, passwordFile: string): Promise<pg.Client> {
  const client = new pg.Client({
    connectionTimeoutMillis: 5_000,
    database: getRequiredEnvironment("POSTGRES_DB"),
    host: getRequiredEnvironment("POSTGRES_HOST"),
    password: await readSecret(passwordFile),
    port: Number(process.env.POSTGRES_PORT ?? "5432"),
    query_timeout: 10_000,
    user,
  });
  await client.connect();
  return client;
}

async function createRedisConnection() {
  const client = createClient({
    password: await readSecret(getRequiredEnvironment("REDIS_PASSWORD_FILE")),
    socket: {
      connectTimeout: 5_000,
      host: getRequiredEnvironment("REDIS_HOST"),
      port: Number(process.env.REDIS_PORT ?? "6379"),
      reconnectStrategy: false,
    },
  });
  await client.connect();
  return client;
}

async function collectTestRateLimitKeys(
  redis: Awaited<ReturnType<typeof createRedisConnection>>,
): Promise<string[]> {
  const redisKeys: string[] = [];

  for await (const item of redis.scanIterator({ MATCH: "promptube:test:rate-limit:*" })) {
    const keys = Array.isArray(item) ? item : [item];

    for (const key of keys) {
      const redisKey = String(key);
      if (redisKey) {
        redisKeys.push(redisKey);
      }
    }
  }

  return redisKeys;
}

async function clearTestRateLimitKeys(redis: Awaited<ReturnType<typeof createRedisConnection>>) {
  const redisKeys = await collectTestRateLimitKeys(redis);

  if (redisKeys.length > 0) {
    await redis.del(redisKeys);
  }
}

async function expectSqlForbidden(client: pg.Client, sql: string): Promise<void> {
  await expect(client.query(sql)).rejects.toThrow();
}

function extractTotpSecret(totpURI: string): string {
  const encodedSecret = new URL(totpURI).searchParams.get("secret");
  if (!encodedSecret) {
    throw new Error("TOTP URI does not contain a secret.");
  }
  return new TextDecoder().decode(base32.decode(encodedSecret));
}

async function generateTotpCode(totpURI: string): Promise<string> {
  return createOTP(extractTotpSecret(totpURI)).totp();
}

async function loginWithPassword(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
  const emailField = page.getByLabel("Email administrateur");
  try {
    await expect(emailField).toBeVisible({ timeout: 10_000 });
  } catch (error) {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    throw new Error(
      `Login form unavailable; status=${response?.status() ?? "unknown"} url=${page.url()} body=${bodyText.slice(0, 500)}`,
      { cause: error },
    );
  }
  await emailField.fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function logout(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Deconnexion" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test("validates the complete local admin authentication lifecycle", async ({ page, request }) => {
  for (const name of requiredEnvironment) {
    getRequiredEnvironment(name);
  }

  const baseURL = getRequiredEnvironment("PLAYWRIGHT_BASE_URL");
  const email = getRequiredEnvironment("TEST_ADMIN_EMAIL");
  const password = await readSecret(getRequiredEnvironment("TEST_ADMIN_PASSWORD_FILE"));
  const runtimeClient = await createDatabaseClient(
    getRequiredEnvironment("POSTGRES_USER"),
    getRequiredEnvironment("POSTGRES_APP_PASSWORD_FILE"),
  );
  const migrationClient = await createDatabaseClient(
    getRequiredEnvironment("POSTGRES_MIGRATION_USER"),
    getRequiredEnvironment("POSTGRES_MIGRATION_PASSWORD_FILE"),
  );
  const redis = await createRedisConnection();

  try {
    await expectSqlForbidden(runtimeClient, "create table runtime_forbidden(id integer)");
    await expectSqlForbidden(runtimeClient, "create schema runtime_forbidden");
    await expectSqlForbidden(runtimeClient, "create role runtime_forbidden");
    await expectSqlForbidden(runtimeClient, 'drop table if exists "user"');
    await expectSqlForbidden(migrationClient, "create role migration_forbidden");

    const migrationState = await migrationClient.query(
      "select count(*)::int as count from drizzle.__drizzle_migrations",
    );
    expect(migrationState.rows[0].count).toBeGreaterThan(0);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/audit");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/setup-2fa");
    await expect(page).toHaveURL(/\/login$/);

    const protectedApi = await request.get("/api/admin/2fa/setup", { maxRedirects: 0 });
    expect([401, 403, 405, 307, 308]).toContain(protectedApi.status());

    const signup = await request.post("/api/auth/sign-up/email", {
      data: {
        email: "public-signup@example.invalid",
        name: "Public Signup",
        password,
      },
      headers: {
        Origin: baseURL,
      },
    });
    expect(signup.ok()).toBe(false);
    const userCount = await runtimeClient.query('select count(*)::int as count from "user"');
    expect(userCount.rows[0].count).toBe(1);

    const missingLogin = await request.post("/api/admin/auth/login", {
      data: {
        email: "missing@example.invalid",
        password: "invalid invalid invalid invalid",
      },
      headers: {
        Origin: baseURL,
      },
    });
    const wrongLogin = await request.post("/api/admin/auth/login", {
      data: {
        email,
        password: "invalid invalid invalid invalid",
      },
      headers: {
        Origin: baseURL,
      },
    });
    expect(wrongLogin.status()).toBe(missingLogin.status());
    expect((await wrongLogin.text()).trim()).toBe((await missingLogin.text()).trim());

    const forgedOrigin = await request.post("/api/admin/auth/login", {
      data: { email, password },
      headers: {
        Origin: "https://evil.example.invalid",
      },
    });
    expect(forgedOrigin.ok()).toBe(false);

    await clearTestRateLimitKeys(redis);

    await loginWithPassword(page, email, password);
    await expect(page).toHaveURL(/\/setup-2fa$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/setup-2fa$/);
    await page.goto("/audit");
    await expect(page).toHaveURL(/\/setup-2fa$/);

    const setupResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/admin/2fa/setup"),
    );
    await page.getByLabel("Mot de passe courant").fill(password);
    await page.getByRole("button", { name: "Generer le secret TOTP" }).click();
    const setupResponse = await setupResponsePromise;
    expect(setupResponse.ok()).toBe(true);
    const setupBody = (await setupResponse.json()) as {
      backupCodes: string[];
      qrCodeDataUrl: string;
      totpURI: string;
    };
    expect(setupBody.backupCodes).toHaveLength(10);
    expect(setupBody.qrCodeDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const backupCode = setupBody.backupCodes[0];
    const firstTotpCode = await generateTotpCode(setupBody.totpURI);

    await page.getByLabel("Code TOTP").fill(firstTotpCode);
    await page.getByRole("button", { name: "Activer le TOTP" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /Fondation de l’administration Promptube/i }),
    ).toBeVisible();

    const enabledUser = await runtimeClient.query(
      'select id, "twoFactorEnabled" from "user" where email = $1',
      [email],
    );
    expect(enabledUser.rows[0].twoFactorEnabled).toBe(true);
    const userId = enabledUser.rows[0].id as string;

    const completeCookies = await page.context().cookies();
    await logout(page);
    const deletedCookie = (await page.context().cookies()).find((cookie) =>
      cookie.name.includes("session_token"),
    );
    expect(deletedCookie).toBeUndefined();

    const oldContext = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: {
        Cookie: completeCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
      },
    });
    const oldDashboard = await oldContext.get("/");
    expect([200, 302, 303, 307, 308, 401, 403]).toContain(oldDashboard.status());
    await oldContext.dispose();

    await loginWithPassword(page, email, password);
    await expect(page).toHaveURL(/\/verify-2fa$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/verify-2fa$/);
    await page.getByLabel("Code TOTP ou code de secours").fill("000000");
    await page.getByRole("button", { name: "Verifier" }).click();
    await expect(page.getByText(/Code invalide/i)).toBeVisible();
    await page
      .getByLabel("Code TOTP ou code de secours")
      .fill(await generateTotpCode(setupBody.totpURI));
    await page.getByRole("button", { name: "Verifier" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(email)).toBeVisible();
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: /Evenements administratifs/i })).toBeVisible();
    await logout(page);

    await loginWithPassword(page, email, password);
    await expect(page).toHaveURL(/\/verify-2fa$/);
    await page.getByLabel("Code TOTP ou code de secours").fill(backupCode);
    await page.getByRole("button", { name: "Verifier" }).click();
    await expect(page).toHaveURL(/\/$/);
    await logout(page);

    await loginWithPassword(page, email, password);
    await expect(page).toHaveURL(/\/verify-2fa$/);
    await page.getByLabel("Code TOTP ou code de secours").fill(backupCode);
    await page.getByRole("button", { name: "Verifier" }).click();
    await expect(page.getByText(/Code invalide/i)).toBeVisible();

    await page
      .getByLabel("Code TOTP ou code de secours")
      .fill(await generateTotpCode(setupBody.totpURI));
    await page.getByRole("button", { name: "Verifier" }).click();
    await expect(page).toHaveURL(/\/$/);
    const revocationCookies = await page.context().cookies();
    const latestSession = await runtimeClient.query(
      'select id from session where "userId" = $1 order by "createdAt" desc limit 1',
      [userId],
    );
    await runtimeClient.query('update session set "revokedAt" = now() where id = $1', [
      latestSession.rows[0].id,
    ]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    const revokedContext = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: {
        Cookie: revocationCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
      },
    });
    const revokedDashboard = await revokedContext.get("/");
    expect([200, 302, 303, 307, 308, 401, 403]).toContain(revokedDashboard.status());
    await revokedContext.dispose();

    await loginWithPassword(page, email, password);
    await expect(page).toHaveURL(/\/verify-2fa$/);
    await page
      .getByLabel("Code TOTP ou code de secours")
      .fill(await generateTotpCode(setupBody.totpURI));
    await page.getByRole("button", { name: "Verifier" }).click();
    await expect(page).toHaveURL(/\/$/);
    await runtimeClient.query(
      'update session set "updatedAt" = now() - interval \'31 minutes\' where "userId" = $1',
      [userId],
    );
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    await loginWithPassword(page, email, password);
    await expect(page).toHaveURL(/\/verify-2fa$/);
    await page
      .getByLabel("Code TOTP ou code de secours")
      .fill(await generateTotpCode(setupBody.totpURI));
    await page.getByRole("button", { name: "Verifier" }).click();
    await expect(page).toHaveURL(/\/$/);
    await runtimeClient.query(
      'update session set "createdAt" = now() - interval \'9 hours\' where "userId" = $1',
      [userId],
    );
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    for (let attempt = 0; attempt < 21; attempt += 1) {
      await request.post("/api/admin/auth/login", {
        data: {
          email,
          password: "invalid invalid invalid invalid",
        },
        headers: {
          Origin: baseURL,
        },
      });
    }
    const limited = await request.post("/api/admin/auth/login", {
      data: {
        email,
        password: "invalid invalid invalid invalid",
      },
      headers: {
        Origin: baseURL,
      },
    });
    expect([400, 401, 429]).toContain(limited.status());

    const redisKeys = await collectTestRateLimitKeys(redis);
    expect(redisKeys.length).toBeGreaterThan(0);
    expect(redisKeys.join("\n")).not.toContain(email);
    for (const key of redisKeys) {
      expect(await redis.ttl(key)).toBeGreaterThan(0);
    }
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    const expiredRedisKeys = await collectTestRateLimitKeys(redis);
    expect(expiredRedisKeys).toHaveLength(0);

    const healthLive = await request.get("/api/health/live");
    expect(healthLive.status()).toBe(200);
    const liveBody = await healthLive.json();
    expect(liveBody).toMatchObject({
      environment: "test",
      service: "promptube-admin-locale",
      status: "ok",
    });
    const healthReady = await request.get("/api/health/ready");
    expect(healthReady.status()).toBe(200);
    const readyBody = await healthReady.json();
    expect(readyBody).toMatchObject({
      dependencies: { postgres: "ok", redis: "ok" },
      environment: "test",
      service: "promptube-admin-locale",
      status: "ok",
    });
    expect(JSON.stringify(readyBody)).not.toMatch(
      /postgresql:\/\/|admin-test-postgres|admin-test-redis|password|secret|token/i,
    );

    await runtimeClient.query('update "user" set banned = true where id = $1', [userId]);
    await loginWithPassword(page, email, password);
    await expect(page).toHaveURL(/\/login$/);

    const auditRows = await runtimeClient.query(
      "select action, outcome, coalesce(metadata::text, '') as metadata from admin_audit_events",
    );
    const actions = auditRows.rows.map((row) => row.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "ADMIN_BOOTSTRAPPED",
        "LOGIN_SUCCEEDED",
        "LOGIN_FAILED",
        "TOTP_SETUP_STARTED",
        "TOTP_ENABLED",
        "TOTP_VERIFICATION_FAILED",
        "SESSION_CREATED",
        "LOGOUT_SUCCEEDED",
        "AUTHORIZATION_DENIED",
      ]),
    );
    const auditText = JSON.stringify(auditRows.rows);
    const auditMetadataText = JSON.stringify(auditRows.rows.map((row) => row.metadata));
    const forbiddenValues = [
      password,
      await readSecret(getRequiredEnvironment("POSTGRES_APP_PASSWORD_FILE")),
      await readSecret(getRequiredEnvironment("POSTGRES_MIGRATION_PASSWORD_FILE")),
      await readSecret(getRequiredEnvironment("REDIS_PASSWORD_FILE")),
      setupBody.totpURI,
      backupCode,
    ];
    for (const forbidden of forbiddenValues) {
      expect(auditText.includes(forbidden)).toBe(false);
    }
    expect(auditMetadataText).not.toMatch(
      /\$argon2|otpauth:\/\/|authorization|cookie|session_token/i,
    );
    await runtimeClient.query('update "user" set banned = false where id = $1', [userId]);
  } finally {
    await redis.quit().catch(() => {});
    await runtimeClient.end().catch(() => {});
    await migrationClient.end().catch(() => {});
  }
});
