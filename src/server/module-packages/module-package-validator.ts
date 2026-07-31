import "server-only";

import { readFile } from "node:fs/promises";

import {
  MODULE_MANIFEST_VERSION,
  MODULE_PACKAGE_CONTRACT_VERSION,
  modulePackageLimits,
} from "./module-package-constants.ts";
import { modulePackageErrorCodes } from "./module-package-error-codes.ts";
import { deepFreezeModulePackageResult } from "./module-package-freeze.ts";
import { createValidationId } from "./module-package-hash.ts";
import { ManifestValidationError, parseAndValidateManifest } from "./module-package-manifest.ts";
import type {
  ModulePackageIssue,
  ModulePackageManifest,
  ModulePackageSourceFile,
  ModulePackageValidationResult,
} from "./module-package-types.ts";
import {
  readModuleArchive,
  readModuleSourceDirectory,
  ModulePackageArchiveError,
} from "./module-package-archive.ts";
import { validateSecureMarkdown } from "../markdown/markdown-validator.ts";

export async function validateModulePackageDirectory(
  sourceDirectory: string,
): Promise<ModulePackageValidationResult> {
  try {
    const files = await readModuleSourceDirectory(sourceDirectory);
    return await validatePackageFiles(files, null, 0);
  } catch (error) {
    return invalidResult(issuesFromError(error), null, 0, 0, 0);
  }
}

export async function validateModulePackageArchive(
  archivePath: string,
): Promise<ModulePackageValidationResult> {
  try {
    const archive = await readModuleArchive(archivePath);
    return await validatePackageFiles(archive.files, archive.archiveSha256, archive.archiveBytes);
  } catch (error) {
    const archiveBytes = await safeFileSize(archivePath);
    return invalidResult(issuesFromError(error), null, archiveBytes, 0, 0);
  }
}

async function validatePackageFiles(
  files: readonly ModulePackageSourceFile[],
  archiveSha256: string | null,
  archiveBytes: number,
): Promise<ModulePackageValidationResult> {
  const startedAt = performance.now();
  const manifestFile = files.find((file) => file.path === "promptube-module.json");
  if (!manifestFile) {
    return invalidResult(
      [
        {
          code: modulePackageErrorCodes.manifestInvalid,
          message: "promptube-module.json is missing.",
        },
      ],
      archiveSha256,
      archiveBytes,
      totalSize(files),
      files.length,
    );
  }

  let manifest: ModulePackageManifest;
  try {
    manifest = await parseAndValidateManifest(manifestFile.bytes, files);
  } catch (error) {
    return invalidResult(
      issuesFromError(error),
      archiveSha256,
      archiveBytes,
      totalSize(files),
      files.length,
    );
  }

  const markdownIssues = await validateMarkdownFiles(files, manifest, startedAt);
  if (markdownIssues.length > 0) {
    return invalidResult(
      markdownIssues,
      archiveSha256,
      archiveBytes,
      totalSize(files),
      files.length,
      manifest,
    );
  }

  return deepFreezeModulePackageResult({
    ok: true,
    report: {
      validationId: createValidationId(),
      contractVersion: MODULE_PACKAGE_CONTRACT_VERSION,
      manifestVersion: manifest.manifestVersion,
      archiveSha256,
      archiveBytes,
      uncompressedBytes: totalSize(files),
      fileCount: files.length,
      verdict: "VALID",
      issues: [],
    },
    manifest,
  });
}

async function validateMarkdownFiles(
  files: readonly ModulePackageSourceFile[],
  manifest: ModulePackageManifest,
  startedAt: number,
): Promise<readonly ModulePackageIssue[]> {
  const issues: ModulePackageIssue[] = [];
  const manifestPaths = manifest.files.map((file) => file.path);
  for (const file of files) {
    if (!file.path.endsWith(".md")) {
      continue;
    }
    if (performance.now() - startedAt > modulePackageLimits.maxPackageValidationMs) {
      issues.push({
        code: modulePackageErrorCodes.resourceLimit,
        message: "Package Markdown validation exceeded the cumulative timeout.",
        limit: modulePackageLimits.maxPackageValidationMs,
      });
      break;
    }
    const result = await validateSecureMarkdown({
      bytes: file.bytes,
      path: file.path,
      manifestFiles: manifestPaths,
      correlationId: `module-package:${manifest.module.id}:${file.path}`,
    });
    if (result.report.verdict !== "MARKDOWN_VALID") {
      issues.push({
        code: modulePackageErrorCodes.markdownInvalid,
        message: result.report.issues[0]?.code ?? "Markdown file is invalid.",
        path: file.path,
      });
    }
  }
  return issues;
}

function invalidResult(
  issues: readonly ModulePackageIssue[],
  archiveSha256: string | null,
  archiveBytes: number,
  uncompressedBytes: number,
  fileCount: number,
  manifest: ModulePackageManifest | null = null,
): ModulePackageValidationResult {
  return deepFreezeModulePackageResult({
    ok: false,
    report: {
      validationId: createValidationId(),
      contractVersion: MODULE_PACKAGE_CONTRACT_VERSION,
      manifestVersion: manifest?.manifestVersion ?? MODULE_MANIFEST_VERSION,
      archiveSha256,
      archiveBytes,
      uncompressedBytes,
      fileCount,
      verdict: "INVALID",
      issues,
    },
    manifest: null,
  });
}

function issuesFromError(error: unknown): readonly ModulePackageIssue[] {
  if (error instanceof ModulePackageArchiveError || error instanceof ManifestValidationError) {
    return error.issues;
  }
  return [
    {
      code: modulePackageErrorCodes.dependencyFailure,
      message: error instanceof Error ? error.message : "Module package dependency failed.",
    },
  ];
}

async function safeFileSize(path: string): Promise<number> {
  try {
    return (await readFile(path)).byteLength;
  } catch {
    return 0;
  }
}

function totalSize(files: readonly ModulePackageSourceFile[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}
