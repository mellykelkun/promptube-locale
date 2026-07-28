import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readDockerSecret } from "@/server/config/secrets";

let temporaryDirectory: string | undefined;

describe("Docker secret reader", () => {
  afterEach(async () => {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { force: true, recursive: true });
      temporaryDirectory = undefined;
    }
  });

  it("reads a non-empty secret while trimming a single trailing newline", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "promptube-secret-test-"));
    const secretPath = join(temporaryDirectory, "secret");
    await writeFile(secretPath, "local-secret-value\n", { mode: 0o600 });

    await expect(readDockerSecret(secretPath)).resolves.toBe("local-secret-value");
  });

  it("rejects an empty secret without echoing a secret value", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "promptube-secret-test-"));
    const secretPath = join(temporaryDirectory, "empty");
    await writeFile(secretPath, "", { mode: 0o600 });

    await expect(readDockerSecret(secretPath)).rejects.toThrow("Secret file is empty.");
  });
});
