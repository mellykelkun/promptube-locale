import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import {
  MARKDOWN_CONTRACT_VERSION,
  MARKDOWN_PIPELINE_VERSION,
  markdownDependencyVersions,
  markdownLimits,
} from "./markdown-contract.ts";
import type {
  InvalidMarkdownValidationReport,
  MarkdownIssue,
  MarkdownValidationMetrics,
  MutableMarkdownMetrics,
  ValidMarkdownValidationReport,
} from "./markdown-types.ts";

export type MarkdownReportDependencies = Readonly<{
  now: () => Date;
  randomUuid: () => string;
  monotonicNow: () => number;
}>;

export const defaultMarkdownReportDependencies: MarkdownReportDependencies = {
  now: () => new Date(),
  randomUuid: randomUUID,
  monotonicNow: () => performance.now(),
};

type ReportContext = Readonly<{
  bytes: Uint8Array;
  path: string;
  correlationId: string;
  metrics: MutableMarkdownMetrics;
  startedAt: number;
  dependencies: MarkdownReportDependencies;
}>;

export function sha256MarkdownSource(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function buildValidMarkdownReport(context: ReportContext): ValidMarkdownValidationReport {
  return {
    ...buildReportBase(context),
    verdict: "MARKDOWN_VALID",
    issues: [],
  };
}

export function buildInvalidMarkdownReport(
  context: ReportContext,
  issues: readonly MarkdownIssue[],
): InvalidMarkdownValidationReport {
  return {
    ...buildReportBase(context),
    verdict: "MARKDOWN_INVALID",
    issues: sortIssues(issues).slice(0, markdownLimits.maxIssues),
  };
}

function buildReportBase(context: ReportContext) {
  const durationMs = Math.max(
    0,
    Math.round((context.dependencies.monotonicNow() - context.startedAt) * 1_000) / 1_000,
  );
  const metrics: MarkdownValidationMetrics = Object.freeze({
    ...context.metrics,
    durationMs,
  });

  return {
    validationId: context.dependencies.randomUuid(),
    contractVersion: MARKDOWN_CONTRACT_VERSION,
    pipelineVersion: MARKDOWN_PIPELINE_VERSION,
    filePath: safeReportPath(context.path),
    sourceSha256: sha256MarkdownSource(context.bytes),
    correlationId: safeCorrelationId(context.correlationId),
    validatedAt: context.dependencies.now().toISOString(),
    dependencyVersions: markdownDependencyVersions,
    metrics,
  };
}

function sortIssues(issues: readonly MarkdownIssue[]): MarkdownIssue[] {
  return [...issues].sort(
    (left, right) =>
      (left.line ?? Number.MAX_SAFE_INTEGER) - (right.line ?? Number.MAX_SAFE_INTEGER) ||
      (left.column ?? Number.MAX_SAFE_INTEGER) - (right.column ?? Number.MAX_SAFE_INTEGER) ||
      left.code.localeCompare(right.code),
  );
}

function safeReportPath(path: string): string {
  return /^[A-Za-z0-9._/-]{1,512}$/u.test(path) && !path.startsWith("/") ? path : "<invalid-path>";
}

function safeCorrelationId(correlationId: string): string {
  return /^[A-Za-z0-9._:-]{1,128}$/u.test(correlationId)
    ? correlationId
    : "<invalid-correlation-id>";
}
