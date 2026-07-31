import "server-only";

import type { MarkdownErrorCode } from "./markdown-error-codes.ts";
import type { ValidatedMarkdownDocument } from "./markdown-validated-document.ts";

export type MarkdownValidationInput = Readonly<{
  bytes: Uint8Array;
  path: string;
  manifestFiles: readonly string[];
  correlationId: string;
  signal?: AbortSignal;
}>;

export type MarkdownWorkerInput = Readonly<{
  bytes: Uint8Array;
  path: string;
  manifestFiles: readonly string[];
  correlationId: string;
}>;

export type MarkdownIssue = Readonly<{
  code: MarkdownErrorCode;
  line?: number;
  column?: number;
  limit?: number;
  actual?: number;
}>;

export type MarkdownValidationMetrics = Readonly<{
  bytes: number;
  lines: number;
  nodes: number;
  maxDepth: number;
  links: number;
  definitions: number;
  tables: number;
  tableRows: number;
  tableColumns: number;
  tableCells: number;
  codeBlockBytes: number;
  durationMs: number;
}>;

type MarkdownValidationReportBase = Readonly<{
  validationId: string;
  contractVersion: string;
  pipelineVersion: string;
  filePath: string;
  sourceSha256: string;
  correlationId: string;
  validatedAt: string;
  dependencyVersions: Readonly<Record<string, string>>;
  metrics: MarkdownValidationMetrics;
}>;

export type ValidMarkdownValidationReport = MarkdownValidationReportBase &
  Readonly<{
    verdict: "MARKDOWN_VALID";
    issues: readonly [];
  }>;

export type InvalidMarkdownValidationReport = MarkdownValidationReportBase &
  Readonly<{
    verdict: "MARKDOWN_INVALID";
    issues: readonly MarkdownIssue[];
  }>;

export type MarkdownValidationReport =
  ValidMarkdownValidationReport | InvalidMarkdownValidationReport;

export type MarkdownValidationResult =
  | Readonly<{
      report: ValidMarkdownValidationReport;
      document: ValidatedMarkdownDocument;
    }>
  | Readonly<{
      report: InvalidMarkdownValidationReport;
      document: null;
    }>;

export type MutableMarkdownMetrics = {
  bytes: number;
  lines: number;
  nodes: number;
  maxDepth: number;
  links: number;
  definitions: number;
  tables: number;
  tableRows: number;
  tableColumns: number;
  tableCells: number;
  codeBlockBytes: number;
  durationMs: number;
};

export function createEmptyMarkdownMetrics(bytes = 0): MutableMarkdownMetrics {
  return {
    bytes,
    lines: 0,
    nodes: 0,
    maxDepth: 0,
    links: 0,
    definitions: 0,
    tables: 0,
    tableRows: 0,
    tableColumns: 0,
    tableCells: 0,
    codeBlockBytes: 0,
    durationMs: 0,
  };
}
