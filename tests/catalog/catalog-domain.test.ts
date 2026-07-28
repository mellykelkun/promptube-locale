import { describe, expect, it } from "vitest";

import { hasCatalogCapability } from "@/server/catalog/catalog-policy";
import {
  catalogMarkdownSchema,
  catalogNameSchema,
  catalogSlugSchema,
  normalizeCatalogSlug,
} from "@/server/catalog/catalog-validation";
import {
  canTransitionCatalogVersion,
  isCatalogVersionImmutable,
} from "@/server/catalog/catalog-workflow";

describe("catalog validation", () => {
  it("normalizes slugs deterministically", () => {
    expect(normalizeCatalogSlug("  Catégorie Démo / Niveau 1  ")).toBe("categorie-demo-niveau-1");
  });

  it("rejects invalid names, slugs and markdown control characters", () => {
    expect(() => catalogNameSchema.parse("A")).toThrow();
    expect(() => catalogSlugSchema.parse("Bad Slug")).toThrow();
    expect(catalogMarkdownSchema.parse("# Titre\n\nTexte\tindenté")).toBe(
      "# Titre\n\nTexte\tindenté",
    );
    expect(() => catalogMarkdownSchema.parse("texte\u0000cache")).toThrow();
  });
});

describe("catalog workflow", () => {
  it("allows only expected editorial transitions", () => {
    expect(canTransitionCatalogVersion("DRAFT", "IN_REVIEW")).toBe(true);
    expect(canTransitionCatalogVersion("IN_REVIEW", "DRAFT")).toBe(true);
    expect(canTransitionCatalogVersion("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionCatalogVersion("DRAFT", "APPROVED")).toBe(false);
    expect(canTransitionCatalogVersion("APPROVED", "DRAFT")).toBe(false);
  });

  it("marks approved and superseded versions immutable", () => {
    expect(isCatalogVersionImmutable("APPROVED")).toBe(true);
    expect(isCatalogVersionImmutable("SUPERSEDED")).toBe(true);
    expect(isCatalogVersionImmutable("DRAFT")).toBe(false);
  });
});

describe("catalog authorization policy", () => {
  it("grants catalog capabilities only to an admin with completed TOTP", () => {
    expect(
      hasCatalogCapability(
        { id: "admin", role: "admin", twoFactorEnabled: true },
        "catalog:approve",
      ),
    ).toBe(true);
    expect(
      hasCatalogCapability(
        { id: "admin", role: "admin", twoFactorEnabled: false },
        "catalog:approve",
      ),
    ).toBe(false);
    expect(
      hasCatalogCapability({ id: "user", role: "user", twoFactorEnabled: true }, "catalog:approve"),
    ).toBe(false);
  });
});
