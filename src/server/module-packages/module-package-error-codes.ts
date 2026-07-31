import "server-only";

export const modulePackageErrorCodes = {
  archiveInvalid: "MODULE_PACKAGE_ARCHIVE_INVALID",
  manifestInvalid: "MODULE_PACKAGE_MANIFEST_INVALID",
  inventoryMismatch: "MODULE_PACKAGE_INVENTORY_MISMATCH",
  checksumMismatch: "MODULE_PACKAGE_CHECKSUM_MISMATCH",
  markdownInvalid: "MODULE_PACKAGE_MARKDOWN_INVALID",
  resourceLimit: "MODULE_PACKAGE_RESOURCE_LIMIT",
  dependencyFailure: "MODULE_PACKAGE_DEPENDENCY_FAILURE",
} as const;

export type ModulePackageErrorCode =
  (typeof modulePackageErrorCodes)[keyof typeof modulePackageErrorCodes];
