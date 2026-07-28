import { describe, expect, it } from "vitest";

import { normalizeAdminEmail } from "@/server/auth/email";

describe("admin email normalization", () => {
  it("normalizes only casing and surrounding whitespace", () => {
    expect(normalizeAdminEmail("  Admin@Promptube.LOCAL  ")).toBe("admin@promptube.local");
  });
});
