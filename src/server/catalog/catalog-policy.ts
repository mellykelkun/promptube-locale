import "server-only";

import { CatalogError, catalogErrorCodes } from "./catalog-errors";

import type { CatalogActor } from "./catalog-types";

export const catalogCapabilities = [
  "catalog:read",
  "catalog:create",
  "catalog:update",
  "catalog:review",
  "catalog:approve",
  "catalog:archive",
] as const;

export type CatalogCapability = (typeof catalogCapabilities)[number];

export function hasCatalogCapability(actor: CatalogActor, capability: CatalogCapability): boolean {
  if (actor.role !== "admin" || !actor.twoFactorEnabled) {
    return false;
  }

  return catalogCapabilities.includes(capability);
}

export function assertCatalogCapability(actor: CatalogActor, capability: CatalogCapability): void {
  if (!hasCatalogCapability(actor, capability)) {
    throw new CatalogError(catalogErrorCodes.authorizationDenied, 403);
  }
}
