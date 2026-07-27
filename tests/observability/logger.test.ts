import { describe, expect, it } from "vitest";

import { createLogger } from "@/server/observability/logger";

describe("structured logger", () => {
  it("emits a structured entry while redacting sensitive context", () => {
    const entries: string[] = [];
    const logger = createLogger({
      now: () => new Date("2026-07-27T12:00:00.000Z"),
      write: (_level, entry) => entries.push(entry),
    });

    logger.error("Request failed token=raw-token", {
      context: {
        apiKey: "raw-api-key",
        nested: {
          cookie: "raw-cookie",
          operation: "healthcheck",
        },
        password: "raw-password",
      },
      correlationId: "correlation-test-123",
      error: new Error("raw-error-message"),
    });

    expect(entries).toHaveLength(1);

    const serializedEntry = entries[0] ?? "";
    const entry = JSON.parse(serializedEntry);

    expect(entry).toEqual({
      context: {
        apiKey: "[REDACTED]",
        nested: {
          cookie: "[REDACTED]",
          operation: "healthcheck",
        },
        password: "[REDACTED]",
      },
      correlationId: "correlation-test-123",
      error: {
        message: "Unexpected error",
        name: "Error",
      },
      level: "error",
      message: "Request failed token=[REDACTED]",
      timestamp: "2026-07-27T12:00:00.000Z",
    });
    expect(serializedEntry).not.toContain("raw-token");
    expect(serializedEntry).not.toContain("raw-api-key");
    expect(serializedEntry).not.toContain("raw-cookie");
    expect(serializedEntry).not.toContain("raw-password");
    expect(serializedEntry).not.toContain("raw-error-message");
  });
});
