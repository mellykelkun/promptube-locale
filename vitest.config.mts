import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/modules/dashboard/components/**/*.{ts,tsx}",
        "src/server/auth/email.ts",
        "src/server/auth/password.ts",
        "src/server/config/**/*.ts",
        "src/server/errors/**/*.ts",
        "src/server/health/**/*.ts",
        "src/server/observability/**/*.ts",
        "src/server/security/**/*.ts",
        "src/shared/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/shared/types/**",
        "src/shared/constants/**",
        "src/shared/config/public-environment.ts",
      ],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 65,
      },
    },
  },
});
