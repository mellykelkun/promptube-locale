import { describe, expect, it } from "vitest";

import { handleLiveness } from "@/server/health/liveness";
import { SERVICE_NAME } from "@/shared/constants/application";

describe("liveness payload", () => {
  it("contains only stable non-sensitive metadata", async () => {
    const response = handleLiveness(new Request("http://localhost/api/health/live"));
    const payload = await response.json();

    expect(payload).toMatchObject({
      service: SERVICE_NAME,
      status: "ok",
    });
    expect(Object.keys(payload).sort()).toEqual([
      "environment",
      "service",
      "status",
      "timestamp",
      "version",
    ]);
    expect(JSON.stringify(payload)).not.toMatch(/password|secret|token|cookie|\/home\//i);
  });
});
