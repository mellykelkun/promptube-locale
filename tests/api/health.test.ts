import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/health/route";
import { SERVICE_NAME } from "@/shared/constants/application";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns only non-sensitive service metadata", async () => {
    const response = GET(
      new Request("http://localhost/api/health", {
        headers: {
          "x-correlation-id": "health-test-123",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-correlation-id")).toBe("health-test-123");
    expect(Object.keys(body).sort()).toEqual([
      "environment",
      "service",
      "status",
      "timestamp",
      "version",
    ]);
    expect(body).toMatchObject({
      environment: "test",
      service: SERVICE_NAME,
      status: "ok",
      version: "0.1.0",
    });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/path|password|secret|stack|token/i);
  });

  it("rejects unexpected query parameters with a safe response", async () => {
    const response = GET(new Request("http://localhost/api/health?details=true"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "La requête de healthcheck est invalide.",
    });
    expect(body).not.toHaveProperty("stack");
  });

  it("rejects an invalid correlation identifier", async () => {
    const response = GET(
      new Request("http://localhost/api/health", {
        headers: {
          "x-correlation-id": "invalid correlation with spaces",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "La requête contient un identifiant de corrélation invalide.",
    });
    expect(response.headers.get("x-correlation-id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
