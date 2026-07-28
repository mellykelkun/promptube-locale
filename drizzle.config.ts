import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/database/schema/index.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  dbCredentials: {
    host: process.env.POSTGRES_HOST ?? "admin-promptube-postgres",
    port: Number(process.env.POSTGRES_PORT ?? "5432"),
    database: process.env.POSTGRES_DB ?? "promptube_admin",
    user: process.env.POSTGRES_MIGRATION_USER ?? "promptube_admin_migration",
    password: process.env.POSTGRES_MIGRATION_PASSWORD ?? "not-used-by-db-generate",
    ssl: false,
  },
});
