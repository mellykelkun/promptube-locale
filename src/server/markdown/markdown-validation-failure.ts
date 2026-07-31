import "server-only";

import { markdownLimits } from "./markdown-contract.ts";
import type { MarkdownIssue } from "./markdown-types.ts";

export class MarkdownValidationFailure extends Error {
  readonly issues: readonly MarkdownIssue[];

  constructor(issues: MarkdownIssue | readonly MarkdownIssue[]) {
    super("Markdown validation failed.");
    this.name = "MarkdownValidationFailure";
    this.issues = (Array.isArray(issues) ? issues : [issues]).slice(0, markdownLimits.maxIssues);
  }
}

export function throwIfMarkdownIssues(issues: readonly MarkdownIssue[]): void {
  if (issues.length > 0) {
    throw new MarkdownValidationFailure(issues);
  }
}
