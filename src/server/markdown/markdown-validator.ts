import "server-only";

import type { MarkdownValidationInput, MarkdownValidationResult } from "./markdown-types.ts";
import { createMarkdownWorkerClient } from "./markdown-worker-client.ts";

const validateWithWorker = createMarkdownWorkerClient();

export async function validateSecureMarkdown(
  input: MarkdownValidationInput,
): Promise<MarkdownValidationResult> {
  return validateWithWorker(input);
}
