import "server-only";

import { constants as fsConstants } from "node:fs";
import type { Stats } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { Readable } from "node:stream";

import * as yauzl from "yauzl";

import {
  modulePackageAllowedDirectories,
  modulePackageLimits,
  modulePackageSupportedCompressionMethods,
} from "./module-package-constants.ts";
import { modulePackageErrorCodes } from "./module-package-error-codes.ts";
import { sha256Hex } from "./module-package-hash.ts";
import type { ModulePackageIssue, ModulePackageSourceFile } from "./module-package-types.ts";
import {
  assertNoPathCollisions,
  comparePackagePaths,
  isAllowedPackageFilePath,
} from "./module-package-paths.ts";

export class ModulePackageArchiveError extends Error {
  constructor(readonly issues: readonly ModulePackageIssue[]) {
    super("Module package archive validation failed.");
  }
}

export type ModulePackageArchiveDependencies = Readonly<{
  fileRead?: BoundedFileReadDependencies;
  openZip?: (buffer: Buffer) => Promise<yauzl.ZipFile>;
}>;

type BoundedFileReadDependencies = Readonly<{
  lstat?: typeof lstat;
  open?: typeof open;
}>;

type BoundedFileReadOptions = Readonly<{
  logicalPath: string;
  maxBytes: number;
}>;

type BoundedFileReadResult = Readonly<{
  bytes: Buffer;
  size: number;
  sha256: string;
}>;

export async function readModuleSourceDirectory(
  sourceDirectory: string,
  dependencies: ModulePackageArchiveDependencies = {},
): Promise<ModulePackageSourceFile[]> {
  const root = resolve(sourceDirectory);
  const rootStats = await lstat(root);
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.archiveInvalid,
        message: "Source package root must be a real directory.",
      },
    ]);
  }
  const files: ModulePackageSourceFile[] = [];
  const state = { fileCount: 0, totalBytes: 0 };
  await walkSourceDirectory(root, root, files, state, dependencies);
  validateCollectedFiles(files);
  return files.sort((left, right) => comparePackagePaths(left.path, right.path));
}

export async function readModuleArchive(archivePath: string): Promise<{
  archiveBytes: number;
  archiveSha256: string;
  files: readonly ModulePackageSourceFile[];
}>;
export async function readModuleArchive(
  archivePath: string,
  dependencies: ModulePackageArchiveDependencies,
): Promise<{
  archiveBytes: number;
  archiveSha256: string;
  files: readonly ModulePackageSourceFile[];
}>;
export async function readModuleArchive(
  archivePath: string,
  dependencies: ModulePackageArchiveDependencies = {},
): Promise<{
  archiveBytes: number;
  archiveSha256: string;
  files: readonly ModulePackageSourceFile[];
}> {
  const archive = await readRegularFileBounded(
    archivePath,
    {
      logicalPath: archivePath,
      maxBytes: modulePackageLimits.maxArchiveBytes,
    },
    dependencies.fileRead,
  );

  const files = await inspectZipBuffer(Buffer.from(archive.bytes), dependencies);
  return {
    archiveBytes: archive.size,
    archiveSha256: archive.sha256,
    files,
  };
}

async function walkSourceDirectory(
  root: string,
  directory: string,
  files: ModulePackageSourceFile[],
  state: { fileCount: number; totalBytes: number },
  dependencies: ModulePackageArchiveDependencies,
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = relative(root, absolutePath).split("\\").join("/");
    const stats = await lstat(absolutePath);

    if (stats.isSymbolicLink() || (!stats.isFile() && !stats.isDirectory())) {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.archiveInvalid,
          message: "Source package contains a link or special file.",
          path: relativePath,
        },
      ]);
    }

    if (stats.isDirectory()) {
      if (!isAllowedDirectoryPrefix(relativePath)) {
        throw new ModulePackageArchiveError([
          {
            code: modulePackageErrorCodes.archiveInvalid,
            message: "Source package contains a forbidden directory.",
            path: relativePath,
          },
        ]);
      }
      await walkSourceDirectory(root, absolutePath, files, state, dependencies);
      continue;
    }

    if (!isAllowedPackageFilePath(relativePath)) {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.archiveInvalid,
          message: "Source package contains a forbidden file path.",
          path: relativePath,
        },
      ]);
    }

    reserveSourceFileRead(relativePath, stats.size, state);
    const file = await readRegularFileBounded(
      absolutePath,
      {
        logicalPath: relativePath,
        maxBytes: modulePackageLimits.maxFileBytes,
      },
      dependencies.fileRead,
    );
    if (file.size !== stats.size) {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.archiveInvalid,
          message: "Source package file changed while it was being read.",
          path: relativePath,
        },
      ]);
    }
    files.push({
      path: relativePath,
      bytes: file.bytes,
      size: file.size,
      sha256: file.sha256,
    });
  }
}

async function inspectZipBuffer(
  buffer: Buffer,
  dependencies: ModulePackageArchiveDependencies,
): Promise<readonly ModulePackageSourceFile[]> {
  const zipFile = await (dependencies.openZip ?? openZip)(buffer);
  const files: ModulePackageSourceFile[] = [];
  const paths: string[] = [];
  let totalCompressed = 0;
  let totalUncompressed = 0;
  let settled = false;

  return await new Promise((resolvePromise, rejectPromise) => {
    const settleFailure = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      closeZip(zipFile);
      rejectPromise(toArchiveError(error));
    };

    const fail = (issue: ModulePackageIssue) =>
      settleFailure(new ModulePackageArchiveError([issue]));

    const settleSuccess = () => {
      if (settled) {
        return;
      }
      try {
        validateCollectedFiles(files);
        settled = true;
        closeZip(zipFile);
        resolvePromise(files.sort((left, right) => comparePackagePaths(left.path, right.path)));
      } catch (error) {
        settleFailure(error);
      }
    };

    zipFile.on("entry", (entry) => {
      void (async () => {
        if (settled) {
          return;
        }
        try {
          if (entry.fileName.endsWith("/")) {
            fail({
              code: modulePackageErrorCodes.archiveInvalid,
              message: "Archive contains explicit directory entries.",
              path: entry.fileName,
            });
            return;
          }
          validateZipEntryMetadata(entry);
          paths.push(entry.fileName);
          totalCompressed += entry.compressedSize;
          totalUncompressed += entry.uncompressedSize;
          if (
            paths.length > modulePackageLimits.maxArchiveFileEntries ||
            totalUncompressed > modulePackageLimits.maxTotalUncompressedBytes ||
            compressionRatio(totalUncompressed, totalCompressed) >
              modulePackageLimits.maxCompressionRatio
          ) {
            fail({
              code: modulePackageErrorCodes.resourceLimit,
              message: "Archive exceeds package limits.",
              actual: Math.max(paths.length, totalUncompressed),
            });
            return;
          }

          const bytes = await readZipEntry(zipFile, entry);
          if (settled) {
            return;
          }
          if (bytes.byteLength !== entry.uncompressedSize) {
            fail({
              code: modulePackageErrorCodes.archiveInvalid,
              message: "Archive entry size does not match the declared size.",
              path: entry.fileName,
            });
            return;
          }
          files.push({
            path: entry.fileName,
            bytes,
            size: bytes.byteLength,
            sha256: sha256Hex(bytes),
          });
          zipFile.readEntry();
        } catch (error) {
          settleFailure(error);
        }
      })();
    });
    zipFile.on("end", settleSuccess);
    zipFile.on("error", (error) => {
      settleFailure(
        new ModulePackageArchiveError([
          {
            code: modulePackageErrorCodes.archiveInvalid,
            message: error.message,
          },
        ]),
      );
    });
    try {
      zipFile.readEntry();
    } catch (error) {
      settleFailure(error);
    }
  });
}

function validateZipEntryMetadata(entry: yauzl.Entry): void {
  if ((entry.generalPurposeBitFlag & 0x1) !== 0) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.archiveInvalid,
        message: "Encrypted ZIP entries are forbidden.",
        path: entry.fileName,
      },
    ]);
  }
  if (!modulePackageSupportedCompressionMethods.has(entry.compressionMethod)) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.archiveInvalid,
        message: "Unsupported ZIP compression method.",
        path: entry.fileName,
      },
    ]);
  }
  if (
    !isAllowedPackageFilePath(entry.fileName) ||
    isSpecialUnixMode(entry.externalFileAttributes)
  ) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.archiveInvalid,
        message: "Archive entry path or file type is forbidden.",
        path: entry.fileName,
      },
    ]);
  }
  if (
    entry.uncompressedSize <= 0 ||
    entry.uncompressedSize > modulePackageLimits.maxFileBytes ||
    compressionRatio(entry.uncompressedSize, entry.compressedSize) >
      modulePackageLimits.maxCompressionRatio
  ) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.resourceLimit,
        message: "Archive entry exceeds file limits.",
        path: entry.fileName,
        limit: modulePackageLimits.maxFileBytes,
        actual: entry.uncompressedSize,
      },
    ]);
  }
}

function validateCollectedFiles(files: readonly ModulePackageSourceFile[]): void {
  const paths = files.map((file) => file.path);
  if (!paths.includes("promptube-module.json") || !paths.includes("README.md")) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.archiveInvalid,
        message: "Package must contain promptube-module.json and README.md at the root.",
      },
    ]);
  }
  if (paths.length > modulePackageLimits.maxArchiveFileEntries) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.resourceLimit,
        message: "Package contains too many files.",
        limit: modulePackageLimits.maxArchiveFileEntries,
        actual: paths.length,
      },
    ]);
  }
  if (!assertNoPathCollisions(paths)) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.archiveInvalid,
        message: "Package contains duplicate paths or case collisions.",
      },
    ]);
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > modulePackageLimits.maxTotalUncompressedBytes) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.resourceLimit,
        message: "Package uncompressed size exceeds the total limit.",
        limit: modulePackageLimits.maxTotalUncompressedBytes,
        actual: total,
      },
    ]);
  }
  for (const file of files) {
    if (file.size <= 0 || file.size > modulePackageLimits.maxFileBytes) {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.resourceLimit,
          message: "Package file exceeds the per-file size limit.",
          path: file.path,
          limit: modulePackageLimits.maxFileBytes,
          actual: file.size,
        },
      ]);
    }
  }
  for (const required of ["instructions", "rules", "workflows"]) {
    if (!paths.some((path) => path.startsWith(`${required}/`) && path.endsWith(".md"))) {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.archiveInvalid,
          message: "Required package directory is empty or missing.",
          path: required,
        },
      ]);
    }
  }
}

async function readRegularFileBounded(
  path: string,
  options: BoundedFileReadOptions,
  dependencies: BoundedFileReadDependencies = {},
): Promise<BoundedFileReadResult> {
  const readLstat = dependencies.lstat ?? lstat;
  const readOpen = dependencies.open ?? open;
  const initialStats = await readLstat(path);
  validateRegularFileStats(initialStats, options);
  const file = await openWithoutFollowingSymlinks(path, options.logicalPath, readOpen);
  try {
    const descriptorStats = await file.stat();
    validateRegularFileStats(descriptorStats, options);
    if (statsIdentityChanged(initialStats, descriptorStats)) {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.archiveInvalid,
          message: "File metadata changed before it was read.",
          path: options.logicalPath,
        },
      ]);
    }
    const bytes = await file.readFile();
    const finalStats = await file.stat();
    validateRegularFileStats(finalStats, options);
    if (
      bytes.byteLength !== descriptorStats.size ||
      finalStats.size !== descriptorStats.size ||
      statsIdentityChanged(descriptorStats, finalStats)
    ) {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.archiveInvalid,
          message: "File metadata changed while it was being read.",
          path: options.logicalPath,
        },
      ]);
    }
    return {
      bytes,
      size: bytes.byteLength,
      sha256: sha256Hex(bytes),
    };
  } finally {
    await file.close();
  }
}

function reserveSourceFileRead(
  path: string,
  size: number,
  state: { fileCount: number; totalBytes: number },
): void {
  const nextFileCount = state.fileCount + 1;
  const nextTotalBytes = state.totalBytes + size;
  if (
    size <= 0 ||
    size > modulePackageLimits.maxFileBytes ||
    nextFileCount > modulePackageLimits.maxArchiveFileEntries ||
    nextTotalBytes > modulePackageLimits.maxTotalUncompressedBytes
  ) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.resourceLimit,
        message: "Source package exceeds file count, per-file size or total size limits.",
        path,
        limit: modulePackageLimits.maxFileBytes,
        actual: Math.max(size, nextFileCount, nextTotalBytes),
      },
    ]);
  }
  state.fileCount = nextFileCount;
  state.totalBytes = nextTotalBytes;
}

function validateRegularFileStats(stats: Stats, options: BoundedFileReadOptions): void {
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.archiveInvalid,
        message: "Package file must be a real regular file.",
        path: options.logicalPath,
      },
    ]);
  }
  if (stats.size <= 0 || stats.size > options.maxBytes) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.resourceLimit,
        message: "Package file exceeds the configured size limit.",
        path: options.logicalPath,
        limit: options.maxBytes,
        actual: stats.size,
      },
    ]);
  }
}

async function openWithoutFollowingSymlinks(
  path: string,
  logicalPath: string,
  readOpen: typeof open,
): Promise<FileHandle> {
  const noFollow = "O_NOFOLLOW" in fsConstants ? fsConstants.O_NOFOLLOW : 0;
  try {
    return await readOpen(path, fsConstants.O_RDONLY | noFollow);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ELOOP") {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.archiveInvalid,
          message: "Package file became a symbolic link before it was opened.",
          path: logicalPath,
        },
      ]);
    }
    throw error;
  }
}

function statsIdentityChanged(left: Stats, right: Stats): boolean {
  return (
    left.dev !== 0 &&
    right.dev !== 0 &&
    left.ino !== 0 &&
    right.ino !== 0 &&
    (left.dev !== right.dev || left.ino !== right.ino)
  );
}

function openZip(buffer: Buffer): Promise<yauzl.ZipFile> {
  return new Promise((resolvePromise, rejectPromise) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, zipFile) => {
        if (error) {
          rejectPromise(error);
          return;
        }
        resolvePromise(zipFile);
      },
    );
  });
}

function readZipEntry(zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
  return new Promise((resolvePromise, rejectPromise) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        rejectPromise(error);
        return;
      }
      void collectStream(stream, entry.uncompressedSize).then(resolvePromise, rejectPromise);
    });
  });
}

async function collectStream(stream: Readable, expectedSize: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > expectedSize || total > modulePackageLimits.maxFileBytes) {
      throw new ModulePackageArchiveError([
        {
          code: modulePackageErrorCodes.resourceLimit,
          message: "ZIP entry stream exceeded the declared or allowed size.",
          actual: total,
        },
      ]);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, total);
}

function compressionRatio(uncompressedSize: number, compressedSize: number): number {
  return uncompressedSize / Math.max(1, compressedSize);
}

function isSpecialUnixMode(externalFileAttributes: number): boolean {
  const mode = (externalFileAttributes >>> 16) & 0o170000;
  return mode !== 0 && mode !== 0o100000;
}

function isAllowedDirectoryPrefix(path: string): boolean {
  if (path.length === 0 || path.includes("\\")) {
    return false;
  }
  const segments = path.split("/");
  if (segments.length > modulePackageLimits.maxDirectoryDepth) {
    return false;
  }
  return (
    modulePackageAllowedDirectories.includes(
      segments[0] as (typeof modulePackageAllowedDirectories)[number],
    ) &&
    segments.every(
      (segment) =>
        segment.length > 0 &&
        segment.length <= modulePackageLimits.maxPathSegmentCharacters &&
        /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/u.test(segment),
    )
  );
}

function toArchiveError(error: unknown): ModulePackageArchiveError {
  if (error instanceof ModulePackageArchiveError) {
    return error;
  }
  return new ModulePackageArchiveError([
    {
      code: modulePackageErrorCodes.dependencyFailure,
      message: error instanceof Error ? error.message : "ZIP dependency failed.",
    },
  ]);
}

function closeZip(zipFile: yauzl.ZipFile): void {
  try {
    zipFile.close();
  } catch {
    // Closing is best-effort after a terminal ZIP validation result.
  }
}

export async function safeModulePackageFileSize(path: string): Promise<number> {
  try {
    const stats = await lstat(path);
    return stats.isFile() ? stats.size : 0;
  } catch {
    return 0;
  }
}
