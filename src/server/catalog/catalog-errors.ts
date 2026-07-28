import "server-only";

export const catalogErrorCodes = {
  activeChildrenExist: "CATALOG_ACTIVE_CHILDREN_EXIST",
  approvedVersionImmutable: "CATALOG_APPROVED_VERSION_IMMUTABLE",
  authorizationDenied: "CATALOG_PERMISSION_DENIED",
  categoryNotFound: "CATALOG_CATEGORY_NOT_FOUND",
  invalidInput: "CATALOG_INVALID_INPUT",
  invalidTransition: "CATALOG_INVALID_TRANSITION",
  moduleNotFound: "CATALOG_MODULE_NOT_FOUND",
  parentArchived: "CATALOG_PARENT_ARCHIVED",
  slugConflict: "CATALOG_SLUG_CONFLICT",
  staleRevision: "CATALOG_STALE_REVISION",
  subcategoryNotFound: "CATALOG_SUBCATEGORY_NOT_FOUND",
  supersededVersionImmutable: "CATALOG_SUPERSEDED_VERSION_IMMUTABLE",
  versionNotFound: "CATALOG_VERSION_NOT_FOUND",
} as const;

export type CatalogErrorCode = (typeof catalogErrorCodes)[keyof typeof catalogErrorCodes];

const publicMessages: Record<CatalogErrorCode, string> = {
  [catalogErrorCodes.activeChildrenExist]:
    "Action impossible tant que des éléments actifs dépendent de cet objet.",
  [catalogErrorCodes.approvedVersionImmutable]: "Une version approuvée localement est immuable.",
  [catalogErrorCodes.authorizationDenied]: "Action catalogue non autorisée.",
  [catalogErrorCodes.categoryNotFound]: "Catégorie introuvable.",
  [catalogErrorCodes.invalidInput]: "Les informations catalogue sont invalides.",
  [catalogErrorCodes.invalidTransition]: "Transition de statut catalogue invalide.",
  [catalogErrorCodes.moduleNotFound]: "Module introuvable.",
  [catalogErrorCodes.parentArchived]: "Le parent archivé empêche cette opération.",
  [catalogErrorCodes.slugConflict]: "Ce slug est déjà utilisé.",
  [catalogErrorCodes.staleRevision]: "L’élément a été modifié ailleurs. Recharge la page.",
  [catalogErrorCodes.subcategoryNotFound]: "Sous-catégorie introuvable.",
  [catalogErrorCodes.supersededVersionImmutable]: "Une version remplacée est immuable.",
  [catalogErrorCodes.versionNotFound]: "Version introuvable.",
};

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;
  readonly status: number;

  constructor(code: CatalogErrorCode, status = 400) {
    super(publicMessages[code]);
    this.name = "CatalogError";
    this.code = code;
    this.status = status;
  }
}

export function isCatalogError(error: unknown): error is CatalogError {
  return error instanceof CatalogError;
}

export function getCatalogErrorMessage(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  if (Object.values(catalogErrorCodes).includes(code as CatalogErrorCode)) {
    return publicMessages[code as CatalogErrorCode];
  }

  return null;
}
