import "server-only";

import type { CatalogWorkflowStatus } from "./catalog-types";

const allowedTransitions = new Set<string>([
  "DRAFT:IN_REVIEW",
  "IN_REVIEW:DRAFT",
  "IN_REVIEW:APPROVED",
]);

export function canTransitionCatalogVersion(
  from: CatalogWorkflowStatus,
  to: CatalogWorkflowStatus,
): boolean {
  return allowedTransitions.has(`${from}:${to}`);
}

export function isCatalogVersionImmutable(status: CatalogWorkflowStatus): boolean {
  return status === "APPROVED" || status === "SUPERSEDED";
}
