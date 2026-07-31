import "server-only";

import { posix } from "node:path";

import {
  modulePackageAllowedDirectories,
  modulePackageAllowedTopLevelNames,
  modulePackageLimits,
} from "./module-package-constants.ts";

const logicalPathPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u;
const markdownFilePattern =
  /^(?:README\.md|(?:instructions|rules|workflows|examples|documentation)\/(?:[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?\/)*[a-z0-9](?:[a-z0-9-]{0,75}[a-z0-9])?\.md)$/u;
const windowsReservedNamePattern = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu;

export function isManifestPath(path: string): boolean {
  return path === "promptube-module.json";
}

export function isAllowedPackageFilePath(path: string): boolean {
  return isManifestPath(path) || isAllowedMarkdownPackagePath(path);
}

export function isAllowedMarkdownPackagePath(path: string): boolean {
  if (!isStructurallySafePackagePath(path) || !markdownFilePattern.test(path)) {
    return false;
  }
  return (
    path === "README.md" ||
    modulePackageAllowedDirectories.some((dir) => path.startsWith(`${dir}/`))
  );
}

export function isStructurallySafePackagePath(path: string): boolean {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.startsWith("~") ||
    path.includes("\\") ||
    path.includes("%") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\u0000") ||
    path.includes(":") ||
    posix.isAbsolute(path) ||
    /^[A-Za-z]:/u.test(path) ||
    Buffer.byteLength(path, "utf8") > modulePackageLimits.maxPathBytes ||
    !logicalPathPattern.test(path)
  ) {
    return false;
  }

  const segments = path.split("/");
  if (segments.length - 1 > modulePackageLimits.maxDirectoryDepth) {
    return false;
  }

  const topLevel = segments[0];
  if (!topLevel || !modulePackageAllowedTopLevelNames.has(topLevel)) {
    return false;
  }

  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment.length <= modulePackageLimits.maxPathSegmentCharacters &&
      segment !== "." &&
      segment !== ".." &&
      !segment.startsWith(".") &&
      !segment.endsWith(".") &&
      !segment.endsWith(" ") &&
      !windowsReservedNamePattern.test(segment),
  );
}

export function comparePackagePaths(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function assertNoPathCollisions(paths: readonly string[]): boolean {
  const exact = new Set<string>();
  const lower = new Set<string>();
  for (const path of paths) {
    const lowered = path.toLowerCase();
    if (exact.has(path) || lower.has(lowered)) {
      return false;
    }
    exact.add(path);
    lower.add(lowered);
  }
  return true;
}
