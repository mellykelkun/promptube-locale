import "server-only";

import { createHash, randomUUID } from "node:crypto";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createValidationId(): string {
  return randomUUID();
}
