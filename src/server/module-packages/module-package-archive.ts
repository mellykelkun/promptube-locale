import "server-only";

import { lstat, readdir, readFile } from "node:fs/promises";
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

export async function readModuleSourceDirectory(
  sourceDirectory: string,
): Promise<ModulePackageSourceFile[]> {
  const root = resolve(sourceDirectory);
  const files: ModulePackageSourceFile[] = [];
  await walkSourceDirectory(root, root, files);
  validateCollectedFiles(files);
  return files.sort((left, right) => comparePackagePaths(left.path, right.path));
}

export async function readModuleArchive(archivePath: string): Promise<{
  archiveBytes: number;
  archiveSha256: string;
  files: readonly ModulePackageSourceFile[];
}> {
  const archive = await readFile(archivePath);
  if (archive.byteLength > modulePackageLimits.maxArchiveBytes) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.resourceLimit,
        message: "Archive size exceeds the compressed size limit.",
        limit: modulePackageLimits.maxArchiveBytes,
        actual: archive.byteLength,
      },
    ]);
  }

  const files = await inspectZipBuffer(Buffer.from(archive));
  return {
    archiveBytes: archive.byteLength,
    archiveSha256: sha256Hex(archive),
    files,
  };
}

async function walkSourceDirectory(
  root: string,
  directory: string,
  files: ModulePackageSourceFile[],
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
      await walkSourceDirectory(root, absolutePath, files);
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

    const bytes = await readFile(absolutePath);
    files.push({
      path: relativePath,
      bytes,
      size: bytes.byteLength,
      sha256: sha256Hex(bytes),
    });
  }
}

async function inspectZipBuffer(buffer: Buffer): Promise<readonly ModulePackageSourceFile[]> {
  const zipFile = await openZip(buffer);
  const files: ModulePackageSourceFile[] = [];
  const paths: string[] = [];
  let totalCompressed = 0;
  let totalUncompressed = 0;
  let closed = false;

  return await new Promise((resolvePromise, rejectPromise) => {
    const fail = (issue: ModulePackageIssue) => {
      if (!closed) {
        closed = true;
        zipFile.close();
      }
      rejectPromise(new ModulePackageArchiveError([issue]));
    };

    zipFile.on("entry", (entry) => {
      void (async () => {
        if (closed) {
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
          rejectPromise(
            error instanceof ModulePackageArchiveError
              ? error
              : new ModulePackageArchiveError([
                  {
                    code: modulePackageErrorCodes.dependencyFailure,
                    message: error instanceof Error ? error.message : "ZIP dependency failed.",
                  },
                ]),
          );
        }
      })();
    });
    zipFile.on("end", () => {
      if (closed) {
        return;
      }
      closed = true;
      zipFile.close();
      try {
        validateCollectedFiles(files);
        resolvePromise(files.sort((left, right) => comparePackagePaths(left.path, right.path)));
      } catch (error) {
        rejectPromise(error);
      }
    });
    zipFile.on("error", (error) => {
      rejectPromise(
        new ModulePackageArchiveError([
          {
            code: modulePackageErrorCodes.archiveInvalid,
            message: error.message,
          },
        ]),
      );
    });
    zipFile.readEntry();
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
      if (error) {
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
