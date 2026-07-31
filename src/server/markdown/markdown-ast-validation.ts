import "server-only";

import type { Code, Definition, Link, LinkReference, Nodes, Root, Table, TableRow } from "mdast";

import { allowedMdastNodeTypes, markdownLimits } from "./markdown-contract.ts";
import { markdownErrorCodes } from "./markdown-error-codes.ts";
import type { MarkdownIssue, MutableMarkdownMetrics } from "./markdown-types.ts";
import { throwIfMarkdownIssues } from "./markdown-validation-failure.ts";

type StackEntry = Readonly<{ node: Nodes; depth: number }>;

export type MarkdownAstValidationSummary = Readonly<{
  links: readonly (Link | Definition)[];
  codeLanguages: readonly (string | null)[];
}>;

const allowedPropertiesByType: Readonly<Record<string, ReadonlySet<string>>> = {
  root: new Set(["type", "children", "position"]),
  paragraph: new Set(["type", "children", "position"]),
  text: new Set(["type", "value", "position"]),
  heading: new Set(["type", "depth", "children", "position"]),
  thematicBreak: new Set(["type", "position"]),
  blockquote: new Set(["type", "children", "position"]),
  list: new Set(["type", "ordered", "start", "spread", "children", "position"]),
  listItem: new Set(["type", "spread", "checked", "children", "position"]),
  emphasis: new Set(["type", "children", "position"]),
  strong: new Set(["type", "children", "position"]),
  delete: new Set(["type", "children", "position"]),
  inlineCode: new Set(["type", "value", "position"]),
  code: new Set(["type", "value", "lang", "meta", "position"]),
  break: new Set(["type", "position"]),
  link: new Set(["type", "url", "title", "children", "position"]),
  linkReference: new Set(["type", "identifier", "label", "referenceType", "children", "position"]),
  definition: new Set(["type", "identifier", "label", "url", "title", "position"]),
  table: new Set(["type", "align", "children", "position"]),
  tableRow: new Set(["type", "children", "position"]),
  tableCell: new Set(["type", "children", "position"]),
};
const mdastParentTypes = new Set([
  "root",
  "paragraph",
  "heading",
  "blockquote",
  "list",
  "listItem",
  "emphasis",
  "strong",
  "delete",
  "link",
  "linkReference",
  "table",
  "tableRow",
  "tableCell",
]);

export function validateMarkdownAst(
  tree: Root,
  metrics: MutableMarkdownMetrics,
  signal?: AbortSignal,
): MarkdownAstValidationSummary {
  const issues: MarkdownIssue[] = [];
  const definitions = new Map<string, Definition>();
  const references: LinkReference[] = [];
  const links: (Link | Definition)[] = [];
  const codeLanguages: (string | null)[] = [];
  const seen = new WeakSet<object>();
  const stack: StackEntry[] = [{ node: tree, depth: 0 }];

  while (stack.length > 0 && issues.length < markdownLimits.maxIssues) {
    if (signal?.aborted) {
      issues.push({ code: markdownErrorCodes.resourceLimit });
      break;
    }

    const entry = stack.pop();
    if (!entry) {
      continue;
    }
    const { node, depth } = entry;
    const position = issuePosition(node);

    if (seen.has(node)) {
      issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
      continue;
    }
    seen.add(node);

    metrics.nodes += 1;
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);
    if (metrics.nodes > markdownLimits.maxNodes || depth > markdownLimits.maxDepth) {
      issues.push({
        code: markdownErrorCodes.limitExceeded,
        ...position,
        limit: depth > markdownLimits.maxDepth ? markdownLimits.maxDepth : markdownLimits.maxNodes,
        actual: depth > markdownLimits.maxDepth ? depth : metrics.nodes,
      });
      continue;
    }

    if (!allowedMdastNodeTypes.has(node.type)) {
      issues.push({ code: nodeErrorCode(node.type), ...position });
      continue;
    }

    const allowedProperties = allowedPropertiesByType[node.type];
    for (const property of Object.keys(node)) {
      if (!allowedProperties?.has(property)) {
        issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
      }
    }

    validateNodeShape(node, issues);
    validateNodeValues(node, issues, metrics, definitions, references, links, codeLanguages);

    if ("children" in node && Array.isArray(node.children)) {
      for (let index = node.children.length - 1; index >= 0; index -= 1) {
        stack.push({ node: node.children[index] as Nodes, depth: depth + 1 });
      }
    }
  }

  for (const reference of references) {
    if (!definitions.has(normalizeIdentifier(reference.identifier))) {
      issues.push({ code: markdownErrorCodes.forbiddenSyntax, ...issuePosition(reference) });
    }
  }

  throwIfMarkdownIssues(issues);
  return { links, codeLanguages };
}

function validateNodeShape(node: Nodes, issues: MarkdownIssue[]): void {
  const record = node as unknown as Record<string, unknown>;
  const position = issuePosition(node);

  if (mdastParentTypes.has(node.type) && !Array.isArray(record.children)) {
    issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
  }
  if (
    (node.type === "text" || node.type === "inlineCode" || node.type === "code") &&
    typeof record.value !== "string"
  ) {
    issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
  }
  if (
    (node.type === "link" || node.type === "definition") &&
    (typeof record.url !== "string" ||
      (record.title !== null && record.title !== undefined && typeof record.title !== "string"))
  ) {
    issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
  }
  if (
    (node.type === "definition" || node.type === "linkReference") &&
    typeof record.identifier !== "string"
  ) {
    issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
  }
  if (
    node.type === "table" &&
    (!Array.isArray(record.align) ||
      record.align.some(
        (value) => value !== null && value !== "left" && value !== "right" && value !== "center",
      ))
  ) {
    issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
  }
}

function validateNodeValues(
  node: Nodes,
  issues: MarkdownIssue[],
  metrics: MutableMarkdownMetrics,
  definitions: Map<string, Definition>,
  references: LinkReference[],
  links: (Link | Definition)[],
  codeLanguages: (string | null)[],
): void {
  const position = issuePosition(node);

  if (node.type === "heading" && (node.depth < 1 || node.depth > 6)) {
    issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
  }

  if (node.type === "list" && node.ordered && node.start !== null && node.start !== undefined) {
    if (!Number.isInteger(node.start) || node.start < 0 || node.start > 10_000) {
      issues.push({ code: markdownErrorCodes.limitExceeded, ...position });
    }
  }

  if (node.type === "code") {
    validateCodeNode(node, issues, metrics, codeLanguages);
  }

  if (node.type === "link") {
    metrics.links += 1;
    links.push(node);
    validateLinkShape(node, issues);
  }

  if (node.type === "definition") {
    metrics.definitions += 1;
    links.push(node);
    validateLinkShape(node, issues);
    const identifier = normalizeIdentifier(node.identifier);
    if (definitions.has(identifier)) {
      issues.push({ code: markdownErrorCodes.forbiddenSyntax, ...position });
    } else {
      definitions.set(identifier, node);
    }
  }

  if (node.type === "linkReference") {
    metrics.links += 1;
    references.push(node);
  }

  if (metrics.links > markdownLimits.maxLinks) {
    issues.push({
      code: markdownErrorCodes.limitExceeded,
      ...position,
      limit: markdownLimits.maxLinks,
      actual: metrics.links,
    });
  }
  if (metrics.definitions > markdownLimits.maxDefinitions) {
    issues.push({
      code: markdownErrorCodes.limitExceeded,
      ...position,
      limit: markdownLimits.maxDefinitions,
      actual: metrics.definitions,
    });
  }

  if (node.type === "table") {
    validateTable(node, issues, metrics);
  }
}

function validateCodeNode(
  node: Code,
  issues: MarkdownIssue[],
  metrics: MutableMarkdownMetrics,
  codeLanguages: (string | null)[],
): void {
  const position = issuePosition(node);
  const bytes = Buffer.byteLength(node.value, "utf8");
  metrics.codeBlockBytes += bytes;
  if (bytes > markdownLimits.maxCodeBlockBytes) {
    issues.push({
      code: markdownErrorCodes.limitExceeded,
      ...position,
      limit: markdownLimits.maxCodeBlockBytes,
      actual: bytes,
    });
  }

  if (node.meta) {
    issues.push({ code: markdownErrorCodes.forbiddenProperty, ...position });
  }

  if (
    node.lang &&
    (node.lang.length > markdownLimits.maxCodeLanguageCharacters ||
      !/^[A-Za-z0-9][A-Za-z0-9+._-]{0,31}$/u.test(node.lang))
  ) {
    issues.push({ code: markdownErrorCodes.forbiddenSyntax, ...position });
  }
  codeLanguages.push(node.lang ?? null);
}

function validateLinkShape(node: Link | Definition, issues: MarkdownIssue[]): void {
  const position = issuePosition(node);
  const urlBytes = Buffer.byteLength(node.url, "utf8");
  if (urlBytes > markdownLimits.maxLinkDestinationBytes) {
    issues.push({
      code: markdownErrorCodes.limitExceeded,
      ...position,
      limit: markdownLimits.maxLinkDestinationBytes,
      actual: urlBytes,
    });
  }
  if (node.title && node.title.length > markdownLimits.maxLinkTitleCharacters) {
    issues.push({
      code: markdownErrorCodes.limitExceeded,
      ...position,
      limit: markdownLimits.maxLinkTitleCharacters,
      actual: node.title.length,
    });
  }
}

function validateTable(
  table: Table,
  issues: MarkdownIssue[],
  metrics: MutableMarkdownMetrics,
): void {
  metrics.tables += 1;
  metrics.tableRows += table.children.length;
  const columns = table.children.reduce(
    (maximum, row: TableRow) => Math.max(maximum, row.children.length),
    0,
  );
  const cells = table.children.reduce((total, row: TableRow) => total + row.children.length, 0);
  metrics.tableColumns = Math.max(metrics.tableColumns, columns);
  metrics.tableCells += cells;

  if (
    metrics.tables > markdownLimits.maxTables ||
    table.children.length > markdownLimits.maxTableRows ||
    columns > markdownLimits.maxTableColumns ||
    metrics.tableCells > markdownLimits.maxTableCells
  ) {
    issues.push({ code: markdownErrorCodes.limitExceeded, ...issuePosition(table) });
  }
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().replace(/\s+/gu, " ").toLowerCase();
}

function nodeErrorCode(type: string) {
  if (type === "html") {
    return markdownErrorCodes.htmlForbidden;
  }
  if (type === "image" || type === "imageReference") {
    return markdownErrorCodes.imageForbidden;
  }
  if (type.startsWith("mdx")) {
    return markdownErrorCodes.mdxForbidden;
  }
  return markdownErrorCodes.forbiddenNode;
}

function issuePosition(node: Nodes): { line?: number; column?: number } {
  const line = node.position?.start.line;
  const column = node.position?.start.column;
  return {
    ...(Number.isInteger(line) && line && line > 0 ? { line } : {}),
    ...(Number.isInteger(column) && column && column > 0 ? { column } : {}),
  };
}
