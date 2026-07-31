import "server-only";

import {
  allowedHastTags,
  MARKDOWN_CONTRACT_VERSION,
  MARKDOWN_PIPELINE_VERSION,
  markdownDependencyVersions,
  markdownLimits,
} from "./markdown-contract.ts";
import { markdownErrorCodes, type MarkdownErrorCode } from "./markdown-error-codes.ts";
import { sha256MarkdownSource } from "./markdown-report.ts";
import type {
  InvalidMarkdownValidationReport,
  MarkdownIssue,
  MarkdownValidationMetrics,
  MarkdownValidationResult,
  MarkdownWorkerInput,
  ValidMarkdownValidationReport,
} from "./markdown-types.ts";
import { validateMarkdownUrl } from "./markdown-url-validation.ts";
import type {
  ValidatedMarkdownDocument,
  ValidatedMarkdownElement,
  ValidatedMarkdownElementProperties,
  ValidatedMarkdownNode,
} from "./markdown-validated-document.ts";

const resultKeys = new Set(["report", "document"]);
const reportKeys = new Set([
  "validationId",
  "contractVersion",
  "pipelineVersion",
  "filePath",
  "sourceSha256",
  "correlationId",
  "validatedAt",
  "dependencyVersions",
  "metrics",
  "verdict",
  "issues",
]);
const metricKeys = new Set([
  "bytes",
  "lines",
  "nodes",
  "maxDepth",
  "links",
  "definitions",
  "tables",
  "tableRows",
  "tableColumns",
  "tableCells",
  "codeBlockBytes",
  "durationMs",
]);
const issueKeys = new Set(["code", "line", "column", "limit", "actual"]);
const documentKeys = new Set([
  "contractVersion",
  "pipelineVersion",
  "sourceSha256",
  "nodes",
  "codeLanguages",
]);
const textNodeKeys = new Set(["kind", "value"]);
const elementNodeKeys = new Set(["kind", "tag", "properties", "children"]);
const knownErrorCodes = new Set<unknown>(Object.values(markdownErrorCodes));
const sha256Pattern = /^[a-f0-9]{64}$/u;
const validationIdPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
const codeLanguagePattern = /^[A-Za-z0-9][A-Za-z0-9+._-]{0,31}$/u;

type ValidationState = {
  nodes: number;
  textBytes: number;
  preElements: number;
};

export function validateAndRebuildMarkdownWorkerResult(
  value: unknown,
  input: MarkdownWorkerInput,
): MarkdownValidationResult | null {
  try {
    return rebuildMarkdownWorkerResult(value, input);
  } catch {
    return null;
  }
}

export function deepFreezeMarkdownValidationResult(
  result: MarkdownValidationResult,
): MarkdownValidationResult {
  const stack: object[] = [result];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const nested of Object.values(current)) {
      if (nested && typeof nested === "object") {
        stack.push(nested);
      }
    }
    Object.freeze(current);
  }

  return result;
}

function rebuildMarkdownWorkerResult(
  value: unknown,
  input: MarkdownWorkerInput,
): MarkdownValidationResult {
  const result = expectRecord(value, resultKeys);
  const report = expectRecord(result.report, reportKeys);
  const verdict = report.verdict;
  if (verdict !== "MARKDOWN_VALID" && verdict !== "MARKDOWN_INVALID") {
    throw new TypeError("Unknown Markdown verdict.");
  }

  const expectedSha256 = sha256MarkdownSource(input.bytes);
  const sourceSha256 = expectSha256(report.sourceSha256);
  if (sourceSha256 !== expectedSha256) {
    throw new TypeError("Worker source digest mismatch.");
  }

  const reportBase = {
    validationId: expectValidationId(report.validationId),
    contractVersion: expectExactString(report.contractVersion, MARKDOWN_CONTRACT_VERSION),
    pipelineVersion: expectExactString(report.pipelineVersion, MARKDOWN_PIPELINE_VERSION),
    filePath: expectExactString(report.filePath, safeReportPath(input.path)),
    sourceSha256,
    correlationId: expectExactString(report.correlationId, safeCorrelationId(input.correlationId)),
    validatedAt: expectIsoDate(report.validatedAt),
    dependencyVersions: rebuildDependencyVersions(report.dependencyVersions),
    metrics: rebuildMetrics(report.metrics, input.bytes.byteLength, verdict === "MARKDOWN_VALID"),
  };
  const issues = rebuildIssues(report.issues);

  if (verdict === "MARKDOWN_INVALID") {
    if (result.document !== null || issues.length === 0) {
      throw new TypeError("Invalid verdict shape.");
    }
    const invalidReport: InvalidMarkdownValidationReport = {
      ...reportBase,
      verdict,
      issues,
    };
    return deepFreezeMarkdownValidationResult({ report: invalidReport, document: null });
  }

  if (issues.length !== 0) {
    throw new TypeError("Valid verdict contains issues.");
  }
  const document = rebuildDocument(result.document, input, expectedSha256);
  const validReport: ValidMarkdownValidationReport = {
    ...reportBase,
    verdict,
    issues: [],
  };
  return deepFreezeMarkdownValidationResult({ report: validReport, document });
}

function rebuildDependencyVersions(value: unknown): Readonly<Record<string, string>> {
  const expectedEntries = Object.entries(markdownDependencyVersions);
  const dependencies = expectRecord(value, new Set(expectedEntries.map(([name]) => name)));
  const rebuilt: Record<string, string> = {};
  for (const [name, version] of expectedEntries) {
    rebuilt[name] = expectExactString(dependencies[name], version);
  }
  return rebuilt;
}

function rebuildMetrics(
  value: unknown,
  expectedBytes: number,
  validVerdict: boolean,
): MarkdownValidationMetrics {
  const metrics = expectRecord(value, metricKeys);
  const rebuilt: MarkdownValidationMetrics = {
    bytes: expectNonNegativeInteger(metrics.bytes),
    lines: expectNonNegativeInteger(metrics.lines),
    nodes: expectNonNegativeInteger(metrics.nodes),
    maxDepth: expectNonNegativeInteger(metrics.maxDepth),
    links: expectNonNegativeInteger(metrics.links),
    definitions: expectNonNegativeInteger(metrics.definitions),
    tables: expectNonNegativeInteger(metrics.tables),
    tableRows: expectNonNegativeInteger(metrics.tableRows),
    tableColumns: expectNonNegativeInteger(metrics.tableColumns),
    tableCells: expectNonNegativeInteger(metrics.tableCells),
    codeBlockBytes: expectNonNegativeInteger(metrics.codeBlockBytes),
    durationMs: expectNonNegativeFiniteNumber(metrics.durationMs),
  };

  if (
    rebuilt.bytes !== expectedBytes ||
    rebuilt.bytes > markdownLimits.maxBytes ||
    rebuilt.lines > rebuilt.bytes ||
    rebuilt.nodes > markdownLimits.maxNodes ||
    rebuilt.maxDepth > markdownLimits.maxDepth ||
    rebuilt.maxDepth > rebuilt.nodes ||
    rebuilt.links > markdownLimits.maxLinks ||
    rebuilt.links > rebuilt.nodes ||
    rebuilt.definitions > markdownLimits.maxDefinitions ||
    rebuilt.definitions > rebuilt.nodes ||
    rebuilt.tables > markdownLimits.maxTables ||
    rebuilt.tables > rebuilt.nodes ||
    rebuilt.tableRows > markdownLimits.maxTables * markdownLimits.maxTableRows ||
    rebuilt.tableRows > rebuilt.nodes ||
    rebuilt.tableColumns > markdownLimits.maxTableColumns ||
    rebuilt.tableCells > markdownLimits.maxTableCells ||
    rebuilt.tableCells > rebuilt.nodes ||
    rebuilt.codeBlockBytes > rebuilt.bytes ||
    (validVerdict && rebuilt.nodes === 0) ||
    (rebuilt.tables === 0 &&
      (rebuilt.tableRows !== 0 || rebuilt.tableColumns !== 0 || rebuilt.tableCells !== 0))
  ) {
    throw new TypeError("Incoherent Markdown metrics.");
  }

  return rebuilt;
}

function rebuildIssues(value: unknown): readonly MarkdownIssue[] {
  if (!Array.isArray(value) || value.length > markdownLimits.maxIssues) {
    throw new TypeError("Malformed Markdown issues.");
  }

  return value.map((candidate) => {
    const issue = expectRecord(candidate, issueKeys, true);
    if (!Object.hasOwn(issue, "code") || !knownErrorCodes.has(issue.code)) {
      throw new TypeError("Unknown Markdown issue code.");
    }
    return {
      code: issue.code as MarkdownErrorCode,
      ...optionalPositiveInteger(issue, "line"),
      ...optionalPositiveInteger(issue, "column"),
      ...optionalNonNegativeInteger(issue, "limit"),
      ...optionalNonNegativeInteger(issue, "actual"),
    };
  });
}

function rebuildDocument(
  value: unknown,
  input: MarkdownWorkerInput,
  expectedSha256: string,
): ValidatedMarkdownDocument {
  const document = expectRecord(value, documentKeys);
  const sourceSha256 = expectSha256(document.sourceSha256);
  if (sourceSha256 !== expectedSha256) {
    throw new TypeError("Document source digest mismatch.");
  }
  if (!Array.isArray(document.nodes) || document.nodes.length === 0) {
    throw new TypeError("Missing validated Markdown nodes.");
  }

  const state: ValidationState = { nodes: 0, textBytes: 0, preElements: 0 };
  const manifest = new Set(input.manifestFiles);
  const nodes = document.nodes.map((node) => rebuildNode(node, 1, state, input.path, manifest));
  const codeLanguages = rebuildCodeLanguages(document.codeLanguages);
  if (codeLanguages.length !== state.preElements) {
    throw new TypeError("Code language metadata mismatch.");
  }

  return {
    contractVersion: expectExactString(document.contractVersion, MARKDOWN_CONTRACT_VERSION),
    pipelineVersion: expectExactString(document.pipelineVersion, MARKDOWN_PIPELINE_VERSION),
    sourceSha256,
    nodes,
    codeLanguages,
  };
}

function rebuildNode(
  value: unknown,
  depth: number,
  state: ValidationState,
  sourcePath: string,
  manifest: ReadonlySet<string>,
): ValidatedMarkdownNode {
  if (depth > markdownLimits.maxDepth) {
    throw new TypeError("Validated Markdown depth exceeded.");
  }
  state.nodes += 1;
  if (state.nodes > markdownLimits.maxNodes) {
    throw new TypeError("Validated Markdown node count exceeded.");
  }

  const node = expectPlainRecord(value);
  if (node.kind === "text") {
    expectExactKeys(node, textNodeKeys);
    if (typeof node.value !== "string") {
      throw new TypeError("Invalid Markdown text.");
    }
    const bytes = Buffer.byteLength(node.value, "utf8");
    state.textBytes += bytes;
    if (
      bytes > markdownLimits.maxBytes ||
      state.textBytes > markdownLimits.maxBytes + state.nodes
    ) {
      throw new TypeError("Validated Markdown text size exceeded.");
    }
    return { kind: "text", value: node.value };
  }

  if (node.kind !== "element") {
    throw new TypeError("Unknown validated Markdown node.");
  }
  expectExactKeys(node, elementNodeKeys);
  if (typeof node.tag !== "string" || !allowedHastTags.has(node.tag)) {
    throw new TypeError("Unknown validated Markdown tag.");
  }
  if (!Array.isArray(node.children)) {
    throw new TypeError("Invalid validated Markdown children.");
  }

  const tag = node.tag as ValidatedMarkdownElement["tag"];
  if (tag === "pre") {
    state.preElements += 1;
  }
  return {
    kind: "element",
    tag,
    properties: rebuildProperties(node.properties, tag, sourcePath, manifest),
    children: node.children.map((child) =>
      rebuildNode(child, depth + 1, state, sourcePath, manifest),
    ),
  };
}

function rebuildProperties(
  value: unknown,
  tag: ValidatedMarkdownElement["tag"],
  sourcePath: string,
  manifest: ReadonlySet<string>,
): ValidatedMarkdownElementProperties {
  const properties = expectPlainRecord(value);

  if (tag === "a") {
    expectAllowedKeys(properties, new Set(["href", "title"]));
    if (!Object.hasOwn(properties, "href") || typeof properties.href !== "string") {
      throw new TypeError("Invalid Markdown href.");
    }
    validateMarkdownUrl(properties.href, sourcePath, manifest);
    if (
      Object.hasOwn(properties, "title") &&
      (typeof properties.title !== "string" ||
        properties.title.length > markdownLimits.maxLinkTitleCharacters)
    ) {
      throw new TypeError("Invalid Markdown title.");
    }
    return {
      href: properties.href,
      ...(typeof properties.title === "string" ? { title: properties.title } : {}),
    };
  }

  if (tag === "ol") {
    expectAllowedKeys(properties, new Set(["start"]));
    if (!Object.hasOwn(properties, "start")) {
      return {};
    }
    const start = expectNonNegativeInteger(properties.start);
    if (start > 10_000) {
      throw new TypeError("Invalid ordered-list start.");
    }
    return { start };
  }

  expectExactKeys(properties, new Set());
  return {};
}

function rebuildCodeLanguages(value: unknown): readonly (string | null)[] {
  if (!Array.isArray(value) || value.length > markdownLimits.maxNodes) {
    throw new TypeError("Invalid code language metadata.");
  }
  return value.map((language) => {
    if (language === null) {
      return null;
    }
    if (typeof language !== "string" || !codeLanguagePattern.test(language)) {
      throw new TypeError("Invalid code language.");
    }
    return language;
  });
}

function expectRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  optionalKeys = false,
): Record<string, unknown> {
  const record = expectPlainRecord(value);
  if (optionalKeys) {
    expectAllowedKeys(record, allowedKeys);
  } else {
    expectExactKeys(record, allowedKeys);
  }
  return record;
}

function expectPlainRecord(value: unknown): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("Expected a plain object.");
  }
  return value as Record<string, unknown>;
}

function expectExactKeys(value: Record<string, unknown>, expected: ReadonlySet<string>): void {
  const keys = Object.keys(value);
  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) {
    throw new TypeError("Unexpected object properties.");
  }
}

function expectAllowedKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError("Unexpected object properties.");
  }
}

function expectExactString(value: unknown, expected: string): string {
  if (value !== expected) {
    throw new TypeError("Unexpected string value.");
  }
  return expected;
}

function expectSha256(value: unknown): string {
  if (typeof value !== "string" || !sha256Pattern.test(value)) {
    throw new TypeError("Invalid SHA-256 digest.");
  }
  return value;
}

function expectValidationId(value: unknown): string {
  if (typeof value !== "string" || !validationIdPattern.test(value)) {
    throw new TypeError("Invalid validation identifier.");
  }
  return value;
}

function expectIsoDate(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("Invalid validation date.");
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError("Invalid validation date.");
  }
  return value;
}

function expectNonNegativeFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError("Expected a non-negative finite number.");
  }
  return value;
}

function expectNonNegativeInteger(value: unknown): number {
  const number = expectNonNegativeFiniteNumber(value);
  if (!Number.isInteger(number)) {
    throw new TypeError("Expected an integer.");
  }
  return number;
}

function optionalPositiveInteger(
  value: Record<string, unknown>,
  key: string,
): Record<string, number> {
  if (!Object.hasOwn(value, key)) {
    return {};
  }
  const number = expectNonNegativeInteger(value[key]);
  if (number === 0) {
    throw new TypeError("Expected a positive integer.");
  }
  return { [key]: number };
}

function optionalNonNegativeInteger(
  value: Record<string, unknown>,
  key: string,
): Record<string, number> {
  return Object.hasOwn(value, key) ? { [key]: expectNonNegativeInteger(value[key]) } : {};
}

function safeReportPath(path: string): string {
  return /^[A-Za-z0-9._/-]{1,512}$/u.test(path) && !path.startsWith("/") ? path : "<invalid-path>";
}

function safeCorrelationId(correlationId: string): string {
  return /^[A-Za-z0-9._:-]{1,128}$/u.test(correlationId)
    ? correlationId
    : "<invalid-correlation-id>";
}
