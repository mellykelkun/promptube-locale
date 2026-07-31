import "server-only";

import type { ModulePackageErrorCode } from "./module-package-error-codes.ts";

export type ModulePackageFileRecord = Readonly<{
  path: string;
  size: number;
  sha256: string;
}>;

export type ModulePackageManifest = Readonly<{
  manifestVersion: "1.0.0";
  module: Readonly<{
    id: string;
    slug: string;
    name: string;
    version: string;
    language: string;
    category: string;
    subcategory: string;
    entrypoint: "README.md";
  }>;
  files: readonly ModulePackageFileRecord[];
  compatibility: Readonly<{
    requiredCapabilities: readonly string[];
    testedEnvironments: readonly Readonly<{
      provider: string;
      model: string;
      interface: string;
      testedAt: string;
      result: "PASS" | "PASS_WITH_LIMITATIONS" | "FAIL";
      limitations: readonly string[];
    }>[];
  }>;
  license: Readonly<{
    id: string;
    version: string;
  }>;
}>;

export type ModulePackageIssue = Readonly<{
  code: ModulePackageErrorCode;
  message: string;
  path?: string;
  limit?: number;
  actual?: number;
}>;

export type ModulePackageReport = Readonly<{
  validationId: string;
  contractVersion: string;
  manifestVersion: string | null;
  archiveSha256: string | null;
  archiveBytes: number;
  uncompressedBytes: number;
  fileCount: number;
  verdict: "VALID" | "INVALID";
  issues: readonly ModulePackageIssue[];
}>;

export type ModulePackageValidationResult =
  | Readonly<{
      ok: true;
      report: ModulePackageReport;
      manifest: ModulePackageManifest;
    }>
  | Readonly<{
      ok: false;
      report: ModulePackageReport;
      manifest: null;
    }>;

export type ModulePackageSourceFile = Readonly<{
  path: string;
  bytes: Uint8Array;
  size: number;
  sha256: string;
}>;

export type BuiltModulePackage = Readonly<{
  archivePath: string;
  archiveSha256: string;
  archiveBytes: number;
  manifest: ModulePackageManifest;
}>;
