import { describe, expect, it } from "vitest";

import {
  argon2idOptions,
  hashAdminPassword,
  validatePasswordPolicy,
  verifyAdminPassword,
} from "@/server/auth/password";

describe("admin password policy and hashing", () => {
  it("accepts passphrases between the configured length bounds", () => {
    expect(validatePasswordPolicy("correct horse battery staple")).toBeNull();
  });

  it("rejects passwords shorter than fourteen characters", () => {
    expect(validatePasswordPolicy("too-short")).toMatch(/14/);
  });

  it("rejects passwords longer than the maximum without truncating", () => {
    expect(validatePasswordPolicy("a".repeat(129))).toMatch(/128/);
  });

  it("hashes and verifies with Argon2id parameters above the OWASP floor", async () => {
    const password = "correct horse battery staple";
    const hash = await hashAdminPassword(password);

    expect(hash).toContain("$argon2id$");
    expect(argon2idOptions).toMatchObject({
      algorithm: 2,
      memoryCost: 64 * 1024,
      parallelism: 1,
      timeCost: 3,
    });
    await expect(verifyAdminPassword({ hash, password })).resolves.toBe(true);
    await expect(verifyAdminPassword({ hash, password: "wrong passphrase value" })).resolves.toBe(
      false,
    );
  });
});
