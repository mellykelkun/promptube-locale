import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  internalPreviewLicense,
  knownModulePackageCatalog,
  knownModulePackageCategory,
  knownModulePackageSubcategory,
  MODULE_MANIFEST_VERSION,
  modulePackageLimits,
} from "./module-package-constants.ts";
import { modulePackageErrorCodes } from "./module-package-error-codes.ts";
import type {
  ModulePackageFileRecord,
  ModulePackageIssue,
  ModulePackageManifest,
  ModulePackageSourceFile,
} from "./module-package-types.ts";
import { parseJsonObjectWithoutDuplicateKeys, stableJsonStringify } from "./module-package-json.ts";
import {
  assertNoPathCollisions,
  comparePackagePaths,
  isAllowedMarkdownPackagePath,
} from "./module-package-paths.ts";

let compiledManifestValidator: ReturnType<Ajv2020["compile"]> | null = null;

export async function parseAndValidateManifest(
  bytes: Uint8Array,
  actualFiles: readonly ModulePackageSourceFile[],
): Promise<ModulePackageManifest> {
  if (bytes.byteLength === 0 || bytes.byteLength > modulePackageLimits.maxManifestBytes) {
    throw new ManifestValidationError([
      {
        code: modulePackageErrorCodes.resourceLimit,
        message: "Manifest size exceeds the contract limit.",
        limit: modulePackageLimits.maxManifestBytes,
        actual: bytes.byteLength,
      },
    ]);
  }

  let manifestObject: Record<string, unknown>;
  try {
    manifestObject = parseJsonObjectWithoutDuplicateKeys(bytes);
  } catch (error) {
    throw new ManifestValidationError([
      {
        code: modulePackageErrorCodes.manifestInvalid,
        message: error instanceof Error ? error.message : "Manifest JSON is invalid.",
      },
    ]);
  }

  const validate = await getManifestValidator();
  if (!validate(manifestObject)) {
    throw new ManifestValidationError([
      {
        code: modulePackageErrorCodes.manifestInvalid,
        message: validate.errors?.[0]?.message ?? "Manifest does not match the JSON schema.",
      },
    ]);
  }

  const manifest = manifestObject as unknown as ModulePackageManifest;
  const issues = validateManifestBusinessRules(manifest, actualFiles);
  if (issues.length > 0) {
    throw new ManifestValidationError(issues);
  }
  return rebuildManifest(manifest);
}

export async function buildManifestFromSource(
  sourceManifestBytes: Uint8Array,
  actualFiles: readonly ModulePackageSourceFile[],
): Promise<ModulePackageManifest> {
  const raw = parseJsonObjectWithoutDuplicateKeys(
    sourceManifestBytes,
  ) as unknown as ModulePackageManifest;
  const files = actualFiles
    .filter((file) => file.path !== "promptube-module.json")
    .map((file) => ({ path: file.path, size: file.size, sha256: file.sha256 }))
    .sort((left, right) => comparePackagePaths(left.path, right.path));

  const manifest: ModulePackageManifest = rebuildManifest({
    manifestVersion: MODULE_MANIFEST_VERSION,
    module: raw.module,
    files,
    compatibility: raw.compatibility ?? { requiredCapabilities: [], testedEnvironments: [] },
    license: raw.license ?? internalPreviewLicense,
  } as ModulePackageManifest);

  await parseAndValidateManifest(Buffer.from(stableJsonStringify(manifest), "utf8"), [
    ...actualFiles.filter((file) => file.path !== "promptube-module.json"),
  ]);
  return manifest;
}

export function serializeManifest(manifest: ModulePackageManifest): Uint8Array {
  return Buffer.from(stableJsonStringify(manifest), "utf8");
}

export class ManifestValidationError extends Error {
  constructor(readonly issues: readonly ModulePackageIssue[]) {
    super("Manifest validation failed.");
  }
}

function validateManifestBusinessRules(
  manifest: ModulePackageManifest,
  actualFiles: readonly ModulePackageSourceFile[],
): readonly ModulePackageIssue[] {
  const issues: ModulePackageIssue[] = [];
  const actualDistributed = actualFiles.filter((file) => file.path !== "promptube-module.json");
  const actualPaths = actualDistributed.map((file) => file.path).sort(comparePackagePaths);
  const manifestPaths = manifest.files.map((file) => file.path);
  const sortedManifestPaths = [...manifestPaths].sort(comparePackagePaths);

  if (JSON.stringify(manifestPaths) !== JSON.stringify(sortedManifestPaths)) {
    issues.push({
      code: modulePackageErrorCodes.inventoryMismatch,
      message: "Manifest file inventory is not lexicographically sorted.",
    });
  }
  if (!assertNoPathCollisions(manifestPaths)) {
    issues.push({
      code: modulePackageErrorCodes.inventoryMismatch,
      message: "Manifest file inventory contains duplicates or case collisions.",
    });
  }
  if (JSON.stringify(actualPaths) !== JSON.stringify(sortedManifestPaths)) {
    issues.push({
      code: modulePackageErrorCodes.inventoryMismatch,
      message: "Manifest inventory does not match the real package files.",
    });
  }

  const actualByPath = new Map(actualDistributed.map((file) => [file.path, file]));
  for (const file of manifest.files) {
    if (!isAllowedMarkdownPackagePath(file.path)) {
      issues.push({
        code: modulePackageErrorCodes.manifestInvalid,
        message: "Manifest contains a forbidden file path.",
        path: file.path,
      });
      continue;
    }
    const actual = actualByPath.get(file.path);
    if (!actual) {
      continue;
    }
    if (actual.size !== file.size) {
      issues.push({
        code: modulePackageErrorCodes.inventoryMismatch,
        message: "Manifest file size does not match the real file.",
        path: file.path,
        actual: file.size,
      });
    }
    if (actual.sha256 !== file.sha256) {
      issues.push({
        code: modulePackageErrorCodes.checksumMismatch,
        message: "Manifest file SHA-256 does not match the real file.",
        path: file.path,
      });
    }
  }

  const known =
    knownModulePackageCatalog[manifest.module.id as keyof typeof knownModulePackageCatalog];
  if (
    !known ||
    manifest.module.slug !== known.slug ||
    manifest.module.name !== known.name ||
    manifest.module.category !== knownModulePackageCategory ||
    manifest.module.subcategory !== knownModulePackageSubcategory ||
    manifest.module.entrypoint !== "README.md"
  ) {
    issues.push({
      code: modulePackageErrorCodes.manifestInvalid,
      message: "Manifest module identity does not match the approved local product context.",
    });
  }
  if (
    manifest.license.id !== internalPreviewLicense.id ||
    manifest.license.version !== internalPreviewLicense.version
  ) {
    issues.push({
      code: modulePackageErrorCodes.manifestInvalid,
      message: "Only the internal private preview license is accepted for draft packages.",
    });
  }

  return issues;
}

function rebuildManifest(manifest: ModulePackageManifest): ModulePackageManifest {
  return {
    manifestVersion: manifest.manifestVersion,
    module: { ...manifest.module },
    files: manifest.files.map((file): ModulePackageFileRecord => ({ ...file })),
    compatibility: {
      requiredCapabilities: [...manifest.compatibility.requiredCapabilities],
      testedEnvironments: manifest.compatibility.testedEnvironments.map((environment) => ({
        ...environment,
        limitations: [...environment.limitations],
      })),
    },
    license: { ...manifest.license },
  };
}

async function getManifestValidator(): Promise<ReturnType<Ajv2020["compile"]>> {
  if (compiledManifestValidator) {
    return compiledManifestValidator;
  }
  const schemaPath = resolve(process.cwd(), "docs/products/schemas/promptube-module.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const ajv = new Ajv2020({ allErrors: false, strict: true, validateFormats: true });
  addFormats(ajv);
  compiledManifestValidator = ajv.compile(schema);
  return compiledManifestValidator;
}
