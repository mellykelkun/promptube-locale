import "server-only";

export const MODULE_PACKAGE_CONTRACT_VERSION = "0.1.0";
export const MODULE_MANIFEST_VERSION = "1.0.0";

export const modulePackageLimits = {
  maxArchiveBytes: 10 * 1024 * 1024,
  maxTotalUncompressedBytes: 25 * 1024 * 1024,
  maxFileBytes: 1024 * 1024,
  maxManifestBytes: 64 * 1024,
  maxManifestFiles: 200,
  maxArchiveFileEntries: 201,
  maxDirectoryDepth: 8,
  maxPathBytes: 240,
  maxPathSegmentCharacters: 80,
  maxCompressionRatio: 100,
  maxPackageValidationMs: 10_000,
} as const;

export const modulePackageAllowedTopLevelNames = new Set([
  "README.md",
  "promptube-module.json",
  "instructions",
  "rules",
  "workflows",
  "examples",
  "documentation",
]);

export const modulePackageRequiredDirectories = ["instructions", "rules", "workflows"] as const;
export const modulePackageOptionalDirectories = ["examples", "documentation"] as const;
export const modulePackageAllowedDirectories = [
  ...modulePackageRequiredDirectories,
  ...modulePackageOptionalDirectories,
] as const;

export const modulePackageSupportedCompressionMethods = new Set([0, 8]);

export const modulePackageNormalizedZipMtime = new Date("1980-01-01T00:00:00.000Z");
export const modulePackageZipFileMode = 0o100644;

export const knownModulePackageCatalog = {
  "promptube-software-architect": {
    slug: "architecte-projet-logiciel",
    name: "Promptube — Architecte de projet logiciel",
  },
  "promptube-methodical-developer": {
    slug: "developpeur-methodique",
    name: "Promptube — Développeur méthodique",
  },
  "promptube-software-auditor": {
    slug: "auditeur-preparation-livraison",
    name: "Promptube — Auditeur logiciel et préparation à la livraison",
  },
} as const;

export const knownModulePackageCategory = "developpement-logiciel";
export const knownModulePackageSubcategory = "ingenierie-logicielle-assistee-par-ia";
export const internalPreviewLicense = {
  id: "previsualisation-privee-interne",
  version: "0.1.0",
} as const;
