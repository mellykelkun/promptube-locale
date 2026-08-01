import "server-only";

import {
  MODULE_PACKAGE_CONTRACT_VERSION,
  modulePackageLimits,
} from "./module-package-constants.ts";
import { modulePackageErrorCodes } from "./module-package-error-codes.ts";
import { deepFreezeModulePackageResult } from "./module-package-freeze.ts";
import { createValidationId, sha256Hex } from "./module-package-hash.ts";
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
  safeModulePackageFileSize,
  type ModulePackageArchiveDependencies,
} from "./module-package-archive.ts";
import { validateSecureMarkdown } from "../markdown/markdown-validator.ts";
import type {
  MarkdownValidationInput,
  MarkdownValidationResult,
} from "../markdown/markdown-types.ts";

type ModulePackageValidationDependencies = Readonly<{
  archive?: ModulePackageArchiveDependencies;
  markdown?: (input: MarkdownValidationInput) => Promise<MarkdownValidationResult>;
  now?: () => number;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
}>;

export async function validateModulePackageDirectory(
  sourceDirectory: string,
  dependencies: ModulePackageValidationDependencies = {},
): Promise<ModulePackageValidationResult> {
  try {
    const files = await readModuleSourceDirectory(sourceDirectory, dependencies.archive);
    return await validatePackageFiles(files, null, 0, dependencies);
  } catch (error) {
    return invalidResult(issuesFromError(error), null, 0, 0, 0);
  }
}

export async function validateModulePackageArchive(
  archivePath: string,
  dependencies: ModulePackageValidationDependencies = {},
): Promise<ModulePackageValidationResult> {
  try {
    const archive = await readModuleArchive(archivePath, dependencies.archive ?? {});
    return await validatePackageFiles(
      archive.files,
      archive.archiveSha256,
      archive.archiveBytes,
      dependencies,
    );
  } catch (error) {
    const archiveBytes = await safeFileSize(archivePath);
    return invalidResult(issuesFromError(error), null, archiveBytes, 0, 0);
  }
}

async function validatePackageFiles(
  files: readonly ModulePackageSourceFile[],
  archiveSha256: string | null,
  archiveBytes: number,
  dependencies: ModulePackageValidationDependencies,
): Promise<ModulePackageValidationResult> {
  const now = dependencies.now ?? (() => performance.now());
  const deadline = now() + modulePackageLimits.maxPackageValidationMs;
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

  const markdownIssues = await validateMarkdownFiles(files, manifest, deadline, dependencies);
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
  deadline: number,
  dependencies: ModulePackageValidationDependencies,
): Promise<readonly ModulePackageIssue[]> {
  const issues: ModulePackageIssue[] = [];
  const manifestPaths = manifest.files.map((file) => file.path);
  const now = dependencies.now ?? (() => performance.now());
  const validateMarkdown = dependencies.markdown ?? validateSecureMarkdown;
  const scheduleTimeout = dependencies.setTimeout ?? setTimeout;
  const cancelTimeout = dependencies.clearTimeout ?? clearTimeout;
  for (const file of files) {
    if (!file.path.endsWith(".md")) {
      continue;
    }
    const remainingMs = deadline - now();
    if (remainingMs <= 0) {
      issues.push(createPackageTimeoutIssue());
      break;
    }
    const abortController = new AbortController();
    const timeout = scheduleTimeout(() => abortController.abort(), remainingMs);
    let result: MarkdownValidationResult;
    try {
      result = await validateMarkdown({
        bytes: file.bytes,
        path: file.path,
        manifestFiles: manifestPaths,
        correlationId: createMarkdownCorrelationId(manifest.module.id, file.path),
        signal: abortController.signal,
      });
    } catch (error) {
      if (abortController.signal.aborted || deadline - now() <= 0) {
        issues.push(createPackageTimeoutIssue());
        break;
      }
      issues.push({
        code: modulePackageErrorCodes.dependencyFailure,
        message: error instanceof Error ? error.message : "Markdown validation dependency failed.",
        path: file.path,
      });
      break;
    } finally {
      cancelTimeout(timeout);
    }
    if (abortController.signal.aborted || deadline - now() <= 0) {
      issues.push(createPackageTimeoutIssue());
      break;
    }
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

function createPackageTimeoutIssue(): ModulePackageIssue {
  return {
    code: modulePackageErrorCodes.resourceLimit,
    message: "Package Markdown validation exceeded the cumulative timeout.",
    limit: modulePackageLimits.maxPackageValidationMs,
  };
}

function createMarkdownCorrelationId(moduleId: string, path: string): string {
  const digest = sha256Hex(Buffer.from(`${moduleId}\u0000${path}`, "utf8")).slice(0, 32);
  return `module-package:${digest}`;
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
      manifestVersion: manifest?.manifestVersion ?? null,
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
  return await safeModulePackageFileSize(path);
}

function totalSize(files: readonly ModulePackageSourceFile[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}
