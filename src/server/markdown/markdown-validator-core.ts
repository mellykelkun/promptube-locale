import "server-only";

import type { Root as HastRoot } from "hast";
import type { Definition, Link, Root as MdastRoot } from "mdast";

import { MARKDOWN_CONTRACT_VERSION, MARKDOWN_PIPELINE_VERSION } from "./markdown-contract.ts";
import { validateMarkdownAst } from "./markdown-ast-validation.ts";
import { markdownErrorCodes } from "./markdown-error-codes.ts";
import { sanitizeAndValidateHast } from "./markdown-hast-validation.ts";
import { projectMarkdownToHast } from "./markdown-hast-projection.ts";
import { parseMarkdown } from "./markdown-parser.ts";
import {
  buildInvalidMarkdownReport,
  buildValidMarkdownReport,
  defaultMarkdownReportDependencies,
  sha256MarkdownSource,
  type MarkdownReportDependencies,
} from "./markdown-report.ts";
import { validateMarkdownSource } from "./markdown-source-validation.ts";
import {
  validateForbiddenMarkdownSyntax,
  validateFrontMatter,
} from "./markdown-syntax-validation.ts";
import type {
  MarkdownValidationResult,
  MarkdownWorkerInput,
  MutableMarkdownMetrics,
} from "./markdown-types.ts";
import { validateMarkdownUrls } from "./markdown-url-validation.ts";
import type { ValidatedMarkdownDocument } from "./markdown-validated-document.ts";
import { MarkdownValidationFailure } from "./markdown-validation-failure.ts";

type MarkdownCoreInput = MarkdownWorkerInput & Readonly<{ signal?: AbortSignal }>;

type MarkdownCoreServices = Readonly<{
  parse: (source: string) => MdastRoot;
  project: (tree: MdastRoot) => Promise<HastRoot>;
  sanitize: (tree: HastRoot) => Promise<{ nodes: ValidatedMarkdownDocument["nodes"] }>;
  validateUrls: (
    nodes: readonly (Link | Definition)[],
    sourcePath: string,
    manifestFiles: readonly string[],
  ) => void;
}>;

type MarkdownValidatorCoreDependencies = MarkdownReportDependencies & Partial<MarkdownCoreServices>;

export function createMarkdownValidatorCore(
  dependencies: MarkdownValidatorCoreDependencies = defaultMarkdownReportDependencies,
): (input: MarkdownCoreInput) => Promise<MarkdownValidationResult> {
  const services: MarkdownCoreServices = {
    parse: dependencies.parse ?? parseMarkdown,
    project: dependencies.project ?? projectMarkdownToHast,
    sanitize: dependencies.sanitize ?? sanitizeAndValidateHast,
    validateUrls: dependencies.validateUrls ?? validateMarkdownUrls,
  };

  return async (input) => {
    const startedAt = dependencies.monotonicNow();
    const metrics = createMetrics(input.bytes.byteLength);
    const reportContext = {
      bytes: input.bytes,
      path: input.path,
      correlationId: input.correlationId,
      metrics,
      startedAt,
      dependencies,
    };

    try {
      throwIfAborted(input.signal);
      const validatedSource = validateMarkdownSource(input.bytes, input.path, metrics);
      validateFrontMatter(validatedSource.source);
      throwIfAborted(input.signal);

      const tree = services.parse(validatedSource.source);
      validateForbiddenMarkdownSyntax(validatedSource.source, tree);
      const summary = validateMarkdownAst(tree, metrics, input.signal);
      services.validateUrls(summary.links, validatedSource.path, [...input.manifestFiles]);
      throwIfAborted(input.signal);

      const hast = await services.project(tree);
      const normalized = await services.sanitize(hast);
      throwIfAborted(input.signal);

      const report = buildValidMarkdownReport(reportContext);
      const document: ValidatedMarkdownDocument = {
        contractVersion: MARKDOWN_CONTRACT_VERSION,
        pipelineVersion: MARKDOWN_PIPELINE_VERSION,
        sourceSha256: sha256MarkdownSource(input.bytes),
        nodes: normalized.nodes,
        codeLanguages: summary.codeLanguages,
      };
      return { report, document };
    } catch (error) {
      const issues =
        error instanceof MarkdownValidationFailure
          ? error.issues
          : [{ code: markdownErrorCodes.dependencyFailure } as const];
      return {
        report: buildInvalidMarkdownReport(reportContext, issues),
        document: null,
      };
    }
  };
}

export const validateMarkdownCore = createMarkdownValidatorCore();

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.resourceLimit });
  }
}

function createMetrics(bytes: number): MutableMarkdownMetrics {
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
