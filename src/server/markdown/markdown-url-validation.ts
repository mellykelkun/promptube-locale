import "server-only";

import { posix } from "node:path";

import ipaddr from "ipaddr.js";
import type { Definition, Link, Nodes } from "mdast";

import { markdownLimits } from "./markdown-contract.ts";
import { markdownErrorCodes } from "./markdown-error-codes.ts";
import { isValidLogicalMarkdownPath } from "./markdown-source-validation.ts";
import { MarkdownValidationFailure } from "./markdown-validation-failure.ts";

const unsafeUrlCharacterPattern = /[\u0000-\u0020\u007F-\u009F]/u;
const encodedControlPattern = /%(?:0[0-9A-F]|1[0-9A-F]|7F)/iu;
const schemePattern = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

export function validateMarkdownUrls(
  nodes: readonly (Link | Definition)[],
  sourcePath: string,
  manifestFiles: readonly string[],
): void {
  const manifest = buildManifestSet(manifestFiles);

  for (const node of nodes) {
    validateMarkdownUrl(node.url, sourcePath, manifest, node);
  }
}

export function validateMarkdownUrl(
  destination: string,
  sourcePath: string,
  manifestFiles: ReadonlySet<string>,
  node?: Nodes,
): void {
  const position = issuePosition(node);
  const destinationBytes = Buffer.byteLength(destination, "utf8");

  if (
    destination.length === 0 ||
    destinationBytes > markdownLimits.maxLinkDestinationBytes ||
    unsafeUrlCharacterPattern.test(destination) ||
    encodedControlPattern.test(destination) ||
    destination.includes("\\") ||
    destination.startsWith("//") ||
    /^[A-Za-z][A-Za-z0-9+.-]*%3A/iu.test(destination)
  ) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.unsafeUrl,
      ...position,
    });
  }

  if (schemePattern.test(destination)) {
    validateExternalUrl(destination, position);
    return;
  }

  validateInternalUrl(destination, sourcePath, manifestFiles, position);
}

function validateExternalUrl(
  destination: string,
  position: { line?: number; column?: number },
): void {
  let parsed: URL;
  try {
    parsed = new URL(destination);
  } catch {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.unsafeUrl, ...position });
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.length === 0 ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.hostname.endsWith(".") ||
    parsed.port === "0"
  ) {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.unsafeUrl, ...position });
  }

  const hostname = stripIpv6Brackets(parsed.hostname).toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.unsafeUrl, ...position });
  }

  if (ipaddr.isValid(hostname)) {
    const address = ipaddr.process(hostname);
    if (address.range() !== "unicast") {
      throw new MarkdownValidationFailure({ code: markdownErrorCodes.unsafeUrl, ...position });
    }
  }
}

function validateInternalUrl(
  destination: string,
  sourcePath: string,
  manifestFiles: ReadonlySet<string>,
  position: { line?: number; column?: number },
): void {
  if (
    destination.startsWith("/") ||
    destination.includes("%") ||
    destination.includes("?") ||
    destination.includes("#") ||
    destination.includes(":") ||
    !destination.endsWith(".md")
  ) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.internalLinkInvalid,
      ...position,
    });
  }

  const segments = destination.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.internalLinkInvalid,
      ...position,
    });
  }

  const resolved = posix.normalize(posix.join(posix.dirname(sourcePath), destination));
  if (!isValidLogicalMarkdownPath(resolved)) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.internalLinkInvalid,
      ...position,
    });
  }

  if (!manifestFiles.has(resolved)) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.internalLinkMissing,
      ...position,
    });
  }
}

function buildManifestSet(manifestFiles: readonly string[]): ReadonlySet<string> {
  const manifest = new Set<string>();
  for (const path of manifestFiles) {
    if (!isValidLogicalMarkdownPath(path)) {
      throw new MarkdownValidationFailure({ code: markdownErrorCodes.internalLinkInvalid });
    }
    manifest.add(path);
  }
  return manifest;
}

function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function issuePosition(node?: Nodes): { line?: number; column?: number } {
  return {
    ...(node?.position?.start.line ? { line: node.position.start.line } : {}),
    ...(node?.position?.start.column ? { column: node.position.start.column } : {}),
  };
}
