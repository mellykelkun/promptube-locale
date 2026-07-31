import "server-only";

import type { Nodes, Root } from "mdast";

import { markdownErrorCodes } from "./markdown-error-codes.ts";
import { offsetToPosition } from "./markdown-source-validation.ts";
import { MarkdownValidationFailure } from "./markdown-validation-failure.ts";

type OffsetRange = Readonly<{ start: number; end: number }>;

export function validateFrontMatter(source: string): void {
  const lines = source.split("\n");
  if (lines[0] === "---") {
    const closing = lines.slice(1).findIndex((line) => line === "---" || line === "...");
    if (closing !== -1) {
      throw new MarkdownValidationFailure({
        code: markdownErrorCodes.frontMatterForbidden,
        line: 1,
        column: 1,
      });
    }
  }

  if (lines[0] === "+++" && lines.slice(1).includes("+++")) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.frontMatterForbidden,
      line: 1,
      column: 1,
    });
  }
}

export function validateForbiddenMarkdownSyntax(source: string, tree: Root): void {
  const codeRanges = collectCodeRanges(tree);

  for (let index = 0; index < source.length; index += 1) {
    if (isInsideRange(index, codeRanges)) {
      continue;
    }

    const character = source[index];
    if ((character === "{" || character === "}") && !isEscaped(source, index)) {
      throw new MarkdownValidationFailure({
        code: markdownErrorCodes.mdxForbidden,
        ...offsetToPosition(source, index),
      });
    }
  }

  let lineStart = 0;
  for (const line of source.split("\n")) {
    const firstContentOffset = lineStart + (line.match(/^\s*/u)?.[0].length ?? 0);
    if (
      !isInsideRange(firstContentOffset, codeRanges) &&
      /^(?:import\s+(?:.+\s+from\s+)?["'][^"']+["']|export\s+(?:default|const|let|var|function|class|\*))/u.test(
        line.trimStart(),
      )
    ) {
      throw new MarkdownValidationFailure({
        code: markdownErrorCodes.mdxForbidden,
        ...offsetToPosition(source, firstContentOffset),
      });
    }
    lineStart += line.length + 1;
  }

  validateExplicitReferences(source, tree, codeRanges);
}

function collectCodeRanges(tree: Root): OffsetRange[] {
  const ranges: OffsetRange[] = [];
  const stack: Nodes[] = [...tree.children];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }

    if (
      (node.type === "code" || node.type === "inlineCode") &&
      typeof node.position?.start.offset === "number" &&
      typeof node.position.end.offset === "number"
    ) {
      ranges.push({ start: node.position.start.offset, end: node.position.end.offset });
      continue;
    }

    if ("children" in node && Array.isArray(node.children)) {
      stack.push(...(node.children as Nodes[]));
    }
  }

  return ranges.sort((left, right) => left.start - right.start);
}

function isInsideRange(offset: number, ranges: readonly OffsetRange[]): boolean {
  return ranges.some((range) => offset >= range.start && offset < range.end);
}

function isEscaped(source: string, offset: number): boolean {
  let backslashes = 0;
  for (let index = offset - 1; index >= 0 && source[index] === "\\"; index -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function validateExplicitReferences(
  source: string,
  tree: Root,
  codeRanges: readonly OffsetRange[],
): void {
  const definitions = new Set<string>();
  const stack: Nodes[] = [...tree.children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }
    if (node.type === "definition") {
      definitions.add(normalizeReferenceIdentifier(node.identifier));
    }
    if ("children" in node && Array.isArray(node.children)) {
      stack.push(...(node.children as Nodes[]));
    }
  }

  const referencePattern = /(?<!!)\[([^\]\n]+)\]\[([^\]\n]*)\]/gu;
  for (const match of source.matchAll(referencePattern)) {
    const offset = match.index;
    if (isInsideRange(offset, codeRanges)) {
      continue;
    }
    const identifier = normalizeReferenceIdentifier(match[2] || match[1]);
    if (!definitions.has(identifier)) {
      throw new MarkdownValidationFailure({
        code: markdownErrorCodes.forbiddenSyntax,
        ...offsetToPosition(source, offset),
      });
    }
  }
}

function normalizeReferenceIdentifier(identifier: string): string {
  return identifier.trim().replace(/\s+/gu, " ").toLowerCase();
}
