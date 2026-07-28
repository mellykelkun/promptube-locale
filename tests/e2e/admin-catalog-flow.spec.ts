import { readFile } from "node:fs/promises";

import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { expect, request as playwrightRequest, test } from "@playwright/test";
import pg from "pg";

const requiredEnvironment = [
  "PLAYWRIGHT_BASE_URL",
  "POSTGRES_APP_PASSWORD_FILE",
  "POSTGRES_BACKUP_PASSWORD_FILE",
  "POSTGRES_BACKUP_USER",
  "POSTGRES_DB",
  "POSTGRES_HOST",
  "POSTGRES_MIGRATION_PASSWORD_FILE",
  "POSTGRES_MIGRATION_USER",
  "POSTGRES_USER",
  "TEST_ADMIN_EMAIL",
  "TEST_ADMIN_PASSWORD_FILE",
] as const;

function env(name: (typeof requiredEnvironment)[number]): string {
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

async function pgClient(user: string, passwordFile: string): Promise<pg.Client> {
  const client = new pg.Client({
    connectionTimeoutMillis: 5_000,
    database: env("POSTGRES_DB"),
    host: env("POSTGRES_HOST"),
    password: await readSecret(passwordFile),
    port: Number(process.env.POSTGRES_PORT ?? "5432"),
    query_timeout: 10_000,
    user,
  });
  await client.connect();
  return client;
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

async function totpFromURI(totpURI: string): Promise<string> {
  return createOTP(extractTotpSecret(totpURI)).totp();
}

async function currentTotpCode(client: pg.Client, userId: string): Promise<string> {
  const result = await client.query('select secret from "twoFactor" where "userId" = $1 limit 1', [
    userId,
  ]);
  const secret = result.rows[0]?.secret as string | undefined;
  if (!secret) {
    throw new Error("TOTP is not configured for the test admin.");
  }
  return createOTP(secret).totp();
}

async function login(
  page: import("@playwright/test").Page,
  client: pg.Client,
  email: string,
  password: string,
): Promise<string> {
  await page.goto("/login");
  await page.getByLabel("Email administrateur").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pathname = new URL(page.url()).pathname;
    if (pathname === "/setup-2fa" || pathname === "/verify-2fa") {
      break;
    }
    if (pathname === "/") {
      await page.goto("/");
    }
    await page.waitForTimeout(250);
  }

  if (page.url().endsWith("/setup-2fa")) {
    const setupResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/admin/2fa/setup"),
    );
    await page.getByLabel("Mot de passe courant").fill(password);
    await page.getByRole("button", { name: "Generer le secret TOTP" }).click();
    const setupBody = (await (await setupResponsePromise).json()) as { totpURI: string };
    await page.getByLabel("Code TOTP").fill(await totpFromURI(setupBody.totpURI));
    await page.getByRole("button", { name: "Activer le TOTP" }).click();
    await expect(page).toHaveURL(/\/$/);
    return setupBody.totpURI;
  }

  await expect(page).toHaveURL(/\/verify-2fa$/);
  const user = await client.query('select id from "user" where email = $1', [email]);
  await page
    .getByLabel("Code TOTP ou code de secours")
    .fill(await currentTotpCode(client, user.rows[0].id));
  await page.getByRole("button", { name: "Verifier" }).click();
  await expect(page).toHaveURL(/\/$/);
  return "";
}

async function logout(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Deconnexion" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function expectVisiblePublicText(
  page: import("@playwright/test").Page,
  text: string,
): Promise<void> {
  try {
    await expect(page.getByText(text)).toBeVisible();
  } catch (error) {
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1200);
    throw new Error(
      `Expected public text not visible: ${text}. Current URL: ${page.url()}. Visible body: ${bodyText}`,
      { cause: error },
    );
  }
}

test("validates the protected local admin catalog lifecycle", async ({ page }) => {
  for (const name of requiredEnvironment) {
    env(name);
  }

  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
    throw new Error("Unexpected dialog; Markdown must not execute.");
  });

  const baseURL = env("PLAYWRIGHT_BASE_URL");
  const email = env("TEST_ADMIN_EMAIL");
  const password = await readSecret(env("TEST_ADMIN_PASSWORD_FILE"));
  const runtime = await pgClient(env("POSTGRES_USER"), env("POSTGRES_APP_PASSWORD_FILE"));
  const migration = await pgClient(
    env("POSTGRES_MIGRATION_USER"),
    env("POSTGRES_MIGRATION_PASSWORD_FILE"),
  );
  const backup = await pgClient(env("POSTGRES_BACKUP_USER"), env("POSTGRES_BACKUP_PASSWORD_FILE"));

  try {
    await expectSqlForbidden(runtime, "create table catalog_runtime_forbidden(id integer)");
    await expectSqlForbidden(
      runtime,
      "alter table catalog_categories add column forbidden integer",
    );
    await expectSqlForbidden(runtime, "drop table catalog_categories");
    await expectSqlForbidden(runtime, "create schema catalog_forbidden");
    await expectSqlForbidden(runtime, "create role catalog_forbidden");
    await expectSqlForbidden(migration, "create role catalog_migration_forbidden");
    await backup.query("select count(*)::int from catalog_categories");
    await expectSqlForbidden(
      backup,
      "insert into catalog_categories(id, name, slug, created_by, updated_by) values (gen_random_uuid(), 'AA', 'aa', 'x', 'x')",
    );

    const schema = await migration.query(
      `
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name like 'catalog_%'
        order by table_name
      `,
    );
    expect(schema.rows.map((row) => row.table_name)).toEqual([
      "catalog_categories",
      "catalog_module_versions",
      "catalog_modules",
      "catalog_subcategories",
    ]);
    const partialIndexes = await migration.query(
      `
        select indexname
        from pg_indexes
        where schemaname = 'public'
          and indexname in (
            'catalog_module_versions_one_mutable_per_module_idx',
            'catalog_module_versions_one_approved_per_module_idx'
          )
        order by indexname
      `,
    );
    expect(partialIndexes.rowCount).toBe(2);

    const anonymous = await playwrightRequest.newContext({ baseURL });
    const anonymousCatalog = await anonymous.get("/catalog", { maxRedirects: 0 });
    expect([302, 303, 307, 308, 401, 403]).toContain(anonymousCatalog.status());
    const anonymousStatus = await anonymous.get("/api/admin/catalog/status", { maxRedirects: 0 });
    expect([302, 303, 307, 308, 401, 403]).toContain(anonymousStatus.status());
    await anonymous.dispose();

    await login(page, runtime, email, password);
    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Catalogue local" })).toBeVisible();

    await page.goto("/catalog/categories/new");
    await page.getByLabel("Nom").fill("Automatisation");
    await page.getByLabel("Slug").fill("");
    await page.getByLabel("Ordre").fill("10");
    await page.getByLabel("Description").fill("Catégorie locale de test.");
    await page.getByRole("button", { name: "Créer la catégorie" }).click();
    await expectVisiblePublicText(page, "Création effectuée.");
    const categoryId = new URL(page.url()).pathname.split("/").at(-1);
    expect(categoryId).toBeTruthy();

    await page.goto("/catalog/subcategories/new");
    await page.getByLabel("Catégorie parente").selectOption({ label: "Automatisation" });
    await page.getByLabel("Nom").fill("Prompts");
    await page.getByLabel("Slug").fill("prompts");
    await page.getByLabel("Ordre").fill("5");
    await page.getByLabel("Description").fill("Sous-catégorie locale.");
    await page.getByRole("button", { name: "Créer la sous-catégorie" }).click();
    await expectVisiblePublicText(page, "Création effectuée.");
    const subcategoryId = new URL(page.url()).pathname.split("/").at(-1);
    expect(subcategoryId).toBeTruthy();

    await page.goto("/catalog/modules/new");
    await page.getByLabel("Sous-catégorie").selectOption({ label: "Automatisation / Prompts" });
    await page.getByLabel("Titre").fill("Module Test Catalogue");
    await page.getByLabel("Slug").fill("module-test-catalogue");
    await page.getByLabel("Locale").fill("fr");
    await page.getByLabel("Résumé").fill("Résumé local pour valider le catalogue.");
    await page
      .getByLabel("Contenu Markdown initial")
      .fill("# Brouillon\n\n<script>alert('xss')</script>\n\nContenu texte uniquement.");
    await page.getByRole("button", { name: "Créer le module" }).click();
    await expectVisiblePublicText(page, "Création effectuée.");
    const moduleId = new URL(page.url()).pathname.split("/").at(-1);
    expect(moduleId).toBeTruthy();

    await page.getByRole("link", { name: "Ouvrir" }).click();
    await expect(page.getByRole("heading", { name: "Version 1" })).toBeVisible();
    await page.getByLabel("Contenu Markdown").fill("# Version 1\n\nTexte validé.");
    await page.getByLabel("Changelog").fill("Création locale.");
    await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
    await expect(page.getByText("Modification enregistrée.")).toBeVisible();
    await page.getByRole("button", { name: "Soumettre en revue" }).click();
    await expect(page.getByText("Version soumise en revue.")).toBeVisible();
    await expect(page.getByLabel("Contenu Markdown")).toHaveAttribute("readonly", "");
    await page.getByRole("button", { name: "Retour en brouillon" }).click();
    await expect(page.getByText("Version remise en brouillon.")).toBeVisible();
    await page.getByLabel("Contenu Markdown").fill("# Version 1\n\nTexte revu.");
    await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
    await expectVisiblePublicText(page, "Modification enregistrée.");
    await page.getByRole("button", { name: "Soumettre en revue" }).click();
    await expectVisiblePublicText(page, "Version soumise en revue.");
    await page.getByRole("button", { name: "Approuver localement" }).click();
    await expect(page.getByText("Version approuvée localement.")).toBeVisible();
    await expect(page.getByText("Approuvé localement")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enregistrer le brouillon" })).toBeDisabled();

    await page.getByRole("button", { name: /Créer la version suivante/i }).click();
    await expect(page.getByText("Création effectuée.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Version 2" })).toBeVisible();
    await page.getByLabel("Contenu Markdown").fill("# Version 2\n\nContenu local v2.");
    await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
    await expectVisiblePublicText(page, "Modification enregistrée.");
    await page.getByRole("button", { name: "Soumettre en revue" }).click();
    await expectVisiblePublicText(page, "Version soumise en revue.");
    await page.getByRole("button", { name: "Approuver localement" }).click();
    await expectVisiblePublicText(page, "Version approuvée localement.");

    await page.goto(`/catalog/modules/${moduleId}`);
    await expect(page.getByText("Remplacé")).toBeVisible();
    await expect(page.getByText("Approuvé localement").first()).toBeVisible();

    await page.goto(`/catalog/categories/${categoryId}`);
    const stalePage = await page.context().newPage();
    await stalePage.goto(`/catalog/categories/${categoryId}`);
    await page.getByLabel("Nom").fill("Automatisation principale");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Modification enregistrée.")).toBeVisible();
    await stalePage.getByLabel("Nom").fill("Automatisation obsolète");
    await stalePage.getByRole("button", { name: "Enregistrer" }).click();
    await expect(stalePage.getByText(/modifié ailleurs/i)).toBeVisible();
    await stalePage.close();

    await page.goto(`/catalog/subcategories/${subcategoryId}`);
    await page.getByRole("button", { name: "Archiver la sous-catégorie" }).click();
    await expect(page.getByText(/éléments actifs/i)).toBeVisible();
    await page.goto(`/catalog/categories/${categoryId}`);
    await page.getByRole("button", { name: "Archiver la catégorie" }).click();
    await expect(page.getByText(/éléments actifs/i)).toBeVisible();

    await page.goto("/catalog/modules?search=module-test-catalogue&page=1");
    await expect(page.getByText("Module Test Catalogue")).toBeVisible();
    await page.goto("/catalog/modules?workflowStatus=APPROVED");
    await expect(page.getByRole("table").getByText("Approuvé localement")).toBeVisible();

    await page.goto(`/catalog/modules/${moduleId}`);
    await page.getByRole("button", { name: "Archiver le module" }).click();
    await expect(page.getByText("Archivage effectué.")).toBeVisible();

    const catalogRows = await runtime.query(
      `
        select
          (select count(*)::int from catalog_categories) as categories,
          (select count(*)::int from catalog_subcategories) as subcategories,
          (select count(*)::int from catalog_modules) as modules,
          (select count(*)::int from catalog_module_versions) as versions
      `,
    );
    expect(catalogRows.rows[0]).toMatchObject({
      categories: 1,
      modules: 1,
      subcategories: 1,
      versions: 2,
    });

    const auditRows = await runtime.query(
      "select action, coalesce(metadata::text, '') as metadata from admin_audit_events where action like 'CATALOG_%'",
    );
    const actions = auditRows.rows.map((row) => row.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "CATALOG_CATEGORY_CREATED",
        "CATALOG_SUBCATEGORY_CREATED",
        "CATALOG_MODULE_CREATED",
        "CATALOG_VERSION_CREATED",
        "CATALOG_VERSION_SUBMITTED",
        "CATALOG_VERSION_RETURNED_TO_DRAFT",
        "CATALOG_VERSION_APPROVED",
        "CATALOG_VERSION_SUPERSEDED",
        "CATALOG_CONFLICT_DETECTED",
        "CATALOG_MODULE_ARCHIVED",
      ]),
    );
    const auditText = JSON.stringify(auditRows.rows);
    expect(auditText).not.toContain("# Version 2");
    expect(auditText).not.toMatch(/<script>|session_token|authorization|password|secret/i);

    await page.goto("/audit");
    await expect(page.getByText("CATALOG_VERSION_APPROVED").first()).toBeVisible();
    await logout(page);
    await page.goto("/catalog");
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await runtime.end().catch(() => {});
    await migration.end().catch(() => {});
    await backup.end().catch(() => {});
  }
});
