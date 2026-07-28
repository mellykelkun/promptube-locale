import "server-only";

import { readFile } from "node:fs/promises";

import { z } from "zod";

const secretFileSchema = z.string().min(1);

export async function readDockerSecret(secretPath: string): Promise<string> {
  const safePath = secretFileSchema.parse(secretPath);
  const value = await readFile(safePath, "utf8");
  const normalized = value.replace(/\r?\n$/, "");

  if (normalized.length === 0) {
    throw new Error("Secret file is empty.");
  }

  return normalized;
}
