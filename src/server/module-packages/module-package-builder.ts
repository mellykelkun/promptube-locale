import "server-only";

import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

import * as yazl from "yazl";

import {
  modulePackageLimits,
  modulePackageNormalizedZipMtime,
  modulePackageZipFileMode,
} from "./module-package-constants.ts";
import { modulePackageErrorCodes } from "./module-package-error-codes.ts";
import { createValidationId, sha256Hex } from "./module-package-hash.ts";
import { buildManifestFromSource, serializeManifest } from "./module-package-manifest.ts";
import type {
  BuiltModulePackage,
  ModulePackageManifest,
  ModulePackageSourceFile,
} from "./module-package-types.ts";
import { comparePackagePaths } from "./module-package-paths.ts";
import { ModulePackageArchiveError, readModuleSourceDirectory } from "./module-package-archive.ts";
import { validateModulePackageArchive } from "./module-package-validator.ts";

export async function buildModulePackageFromDirectory(
  sourceDirectory: string,
  outputDirectory = "artifacts/modules",
): Promise<BuiltModulePackage> {
  const sourceFiles = await readModuleSourceDirectory(sourceDirectory);
  const sourceManifest = requiredFile(sourceFiles, "promptube-module.json");
  const manifest = await buildManifestFromSource(sourceManifest.bytes, sourceFiles);
  const manifestBytes = serializeManifest(manifest);
  const archiveFiles = [
    ...sourceFiles.filter((file) => file.path !== "promptube-module.json"),
    {
      path: "promptube-module.json",
      bytes: manifestBytes,
      size: manifestBytes.byteLength,
      sha256: sha256Hex(manifestBytes),
    },
  ].sort((left, right) => comparePackagePaths(left.path, right.path));

  const archiveBytes = await createDeterministicZip(archiveFiles);
  if (archiveBytes.byteLength > modulePackageLimits.maxArchiveBytes) {
    throw new ModulePackageArchiveError([
      {
        code: modulePackageErrorCodes.resourceLimit,
        message: "Built archive exceeds the compressed size limit.",
        limit: modulePackageLimits.maxArchiveBytes,
        actual: archiveBytes.byteLength,
      },
    ]);
  }

  await mkdir(outputDirectory, { recursive: true });
  const archivePath = resolve(
    outputDirectory,
    `promptube-${manifest.module.slug}-${manifest.module.version}.zip`,
  );
  const temporaryPath = resolve(
    outputDirectory,
    `.${basename(archivePath)}.${createValidationId()}.tmp`,
  );
  let promoted = false;
  try {
    await writeFile(temporaryPath, archiveBytes, { mode: 0o600, flag: "wx" });
    const validation = await validateModulePackageArchive(temporaryPath);
    if (!validation.ok) {
      throw new ModulePackageArchiveError(validation.report.issues);
    }
    await rename(temporaryPath, archivePath);
    promoted = true;
    return {
      archivePath,
      archiveSha256: sha256Hex(archiveBytes),
      archiveBytes: archiveBytes.byteLength,
      manifest,
    };
  } finally {
    if (!promoted) {
      await unlinkIfExists(temporaryPath);
    }
  }
}

export async function buildAllModulePackages(
  sourceRoot = "private-modules/developpement-logiciel",
  outputDirectory = "artifacts/modules",
): Promise<readonly BuiltModulePackage[]> {
  const modules = [
    "architecte-projet-logiciel",
    "developpeur-methodique",
    "auditeur-preparation-livraison",
  ];
  const built: BuiltModulePackage[] = [];
  for (const moduleSlug of modules) {
    built.push(
      await buildModulePackageFromDirectory(join(sourceRoot, moduleSlug), outputDirectory),
    );
  }
  return built;
}

export async function writeGeneratedManifest(
  sourceDirectory: string,
): Promise<ModulePackageManifest> {
  const sourceFiles = await readModuleSourceDirectory(sourceDirectory);
  const sourceManifest = requiredFile(sourceFiles, "promptube-module.json");
  const manifest = await buildManifestFromSource(sourceManifest.bytes, sourceFiles);
  const manifestPath = resolve(sourceDirectory, "promptube-module.json");
  await writeFile(manifestPath, serializeManifest(manifest), { mode: 0o600 });
  return manifest;
}

async function createDeterministicZip(files: readonly ModulePackageSourceFile[]): Promise<Buffer> {
  const zip = new yazl.ZipFile();
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolvePromise, rejectPromise) => {
    zip.outputStream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    zip.outputStream.on("end", () => resolvePromise(Buffer.concat(chunks)));
    zip.outputStream.on("error", rejectPromise);
  });

  for (const file of files) {
    zip.addBuffer(Buffer.from(file.bytes), file.path, {
      mtime: modulePackageNormalizedZipMtime,
      mode: modulePackageZipFileMode,
      compress: true,
      compressionLevel: 9,
      forceDosTimestamp: true,
    });
  }
  zip.end();
  return await finished;
}

async function unlinkIfExists(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

function requiredFile(
  files: readonly ModulePackageSourceFile[],
  path: string,
): ModulePackageSourceFile {
  const file = files.find((candidate) => candidate.path === path);
  if (!file) {
    throw new Error(`${basename(path)} is missing.`);
  }
  return file;
}
