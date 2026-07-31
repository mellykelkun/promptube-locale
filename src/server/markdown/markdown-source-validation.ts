import "server-only";

import { posix } from "node:path";

import { markdownLimits } from "./markdown-contract.ts";
import { markdownErrorCodes } from "./markdown-error-codes.ts";
import type { MutableMarkdownMetrics } from "./markdown-types.ts";
import { MarkdownValidationFailure } from "./markdown-validation-failure.ts";

const forbiddenUnicodePattern =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\u202A-\u202E\u2066-\u2069\uFEFF]/u;
const logicalPathPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u;
const windowsReservedNamePattern = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu;

export type ValidatedMarkdownSource = Readonly<{
  source: string;
  path: string;
}>;

export function isValidLogicalMarkdownPath(path: string): boolean {
  if (
    path.length === 0 ||
    !path.endsWith(".md") ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("%") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\u0000") ||
    posix.isAbsolute(path) ||
    Buffer.byteLength(path, "utf8") > 240 ||
    !logicalPathPattern.test(path)
  ) {
    return false;
  }

  const segments = path.split("/");
  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment.length <= 80 &&
      segment !== "." &&
      segment !== ".." &&
      !segment.startsWith(".") &&
      !segment.endsWith(".") &&
      !windowsReservedNamePattern.test(segment),
  );
}

export function validateMarkdownSource(
  bytes: Uint8Array,
  path: string,
  metrics: MutableMarkdownMetrics,
): ValidatedMarkdownSource {
  metrics.bytes = bytes.byteLength;

  if (bytes.byteLength === 0 || bytes.byteLength > markdownLimits.maxBytes) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.limitExceeded,
      limit: markdownLimits.maxBytes,
      actual: bytes.byteLength,
    });
  }

  if (!isValidLogicalMarkdownPath(path)) {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.forbiddenSyntax });
  }

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.bomForbidden,
      line: 1,
      column: 1,
    });
  }

  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.invalidEncoding });
  }

  const forbiddenCharacter = forbiddenUnicodePattern.exec(source);
  if (forbiddenCharacter) {
    const position = offsetToPosition(source, forbiddenCharacter.index);
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.forbiddenCharacter,
      ...position,
    });
  }

  const carriageReturn = source.indexOf("\r");
  if (carriageReturn !== -1) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.invalidLineEnding,
      ...offsetToPosition(source, carriageReturn),
    });
  }

  if (!source.endsWith("\n")) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.invalidLineEnding,
      ...offsetToPosition(source, source.length),
    });
  }

  let lineBytes = 0;
  let line = 1;
  for (const byte of bytes) {
    if (byte === 0x0a) {
      if (lineBytes > markdownLimits.maxLineBytes) {
        throw new MarkdownValidationFailure({
          code: markdownErrorCodes.limitExceeded,
          line,
          column: markdownLimits.maxLineBytes + 1,
          limit: markdownLimits.maxLineBytes,
          actual: lineBytes,
        });
      }
      line += 1;
      lineBytes = 0;
    } else {
      lineBytes += 1;
    }
  }
  metrics.lines = line - 1;

  return { source, path };
}

export function offsetToPosition(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;

  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 0x0a) {
      line += 1;
      lineStart = index + 1;
    }
  }

  return { line, column: offset - lineStart + 1 };
}
