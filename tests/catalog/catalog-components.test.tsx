import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CatalogBadge } from "@/modules/catalog/components/catalog-badge";
import { CatalogFilterForm } from "@/modules/catalog/components/catalog-filter-form";
import {
  CategoryFields,
  ModuleFields,
  SubcategoryFields,
} from "@/modules/catalog/components/catalog-form-fields";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";
import { CatalogStatusMessage } from "@/modules/catalog/components/catalog-status-message";
import type {
  CatalogCategoryDto,
  CatalogModuleDto,
  CatalogSubcategoryDto,
} from "@/server/catalog/catalog-types";
import {
  catalogErrorCodes,
  CatalogError,
  getCatalogErrorMessage,
  isCatalogError,
} from "@/server/catalog/catalog-errors";
import { ErrorState } from "@/shared/components/error-state";

const now = new Date("2026-07-28T00:00:00.000Z");

function category(overrides: Partial<CatalogCategoryDto> = {}): CatalogCategoryDto {
  return {
    archivedAt: null,
    createdAt: now,
    description: "Description courte",
    id: "11111111-1111-4111-8111-111111111111",
    name: "Fondations",
    revision: 3,
    slug: "fondations",
    sortOrder: 10,
    updatedAt: now,
    ...overrides,
  };
}

function subcategory(overrides: Partial<CatalogSubcategoryDto> = {}): CatalogSubcategoryDto {
  return {
    ...category(),
    categoryId: "22222222-2222-4222-8222-222222222222",
    categoryName: "Administration",
    id: "33333333-3333-4333-8333-333333333333",
    name: "Sécurité",
    slug: "securite",
    ...overrides,
  };
}

function module(overrides: Partial<CatalogModuleDto> = {}): CatalogModuleDto {
  return {
    archivedAt: null,
    categoryName: "Administration",
    createdAt: now,
    id: "44444444-4444-4444-8444-444444444444",
    latestStatus: "DRAFT",
    locale: "fr",
    revision: 7,
    slug: "module-local",
    subcategoryId: "33333333-3333-4333-8333-333333333333",
    subcategoryName: "Sécurité",
    summary: "Résumé du module",
    title: "Module local",
    updatedAt: now,
    ...overrides,
  };
}

describe("catalog UI components", () => {
  it("renders workflow and archived badges with explicit labels", () => {
    const { rerender } = render(<CatalogBadge status="APPROVED" />);
    expect(screen.getByText("Approuvé localement")).toBeInTheDocument();

    rerender(<CatalogBadge archivedAt={now} status="DRAFT" />);
    expect(screen.getByText("Archivé")).toBeInTheDocument();

    rerender(<CatalogBadge />);
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("renders a page header with an optional action link", () => {
    render(
      <CatalogPageHeader
        actionHref="/catalog/modules/new"
        actionLabel="Nouveau module"
        description="Description de page"
        title="Modules"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Modules" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nouveau module" })).toHaveAttribute(
      "href",
      "/catalog/modules/new",
    );
  });

  it("renders filter fields with bounded search and workflow options", () => {
    render(<CatalogFilterForm defaultSearch="module" showWorkflow workflowStatus="IN_REVIEW" />);

    expect(screen.getByLabelText("Recherche")).toHaveAttribute("maxLength", "120");
    expect(screen.getByLabelText("État")).toHaveValue("active");
    expect(screen.getByLabelText("Workflow")).toHaveValue("IN_REVIEW");
    expect(screen.getByRole("button", { name: "Filtrer" })).toHaveAttribute("type", "submit");
  });

  it("renders accessible status and public catalog error messages", () => {
    const { rerender } = render(<CatalogStatusMessage status="submitted" />);

    expect(screen.getByText("Version soumise en revue.")).toHaveAttribute("aria-live", "polite");

    rerender(<CatalogStatusMessage error={catalogErrorCodes.staleRevision} />);
    expect(screen.getByText(/modifié ailleurs/i)).toHaveAttribute("aria-live", "polite");

    rerender(<CatalogStatusMessage />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders category fields with optimistic-locking metadata", () => {
    render(<CategoryFields category={category()} />);

    expect(screen.getByLabelText("Nom")).toHaveValue("Fondations");
    expect(screen.getByLabelText("Slug")).toHaveAttribute("pattern", "[a-z0-9]+(-[a-z0-9]+)*");
    expect(screen.getByLabelText("Ordre")).toHaveValue(10);
    expect(document.querySelector<HTMLInputElement>("input[name='id']")?.value).toBe(category().id);
    expect(document.querySelector<HTMLInputElement>("input[name='expectedRevision']")?.value).toBe(
      "3",
    );
  });

  it("renders subcategory and module relationship selectors", () => {
    const parentCategory = category({ id: subcategory().categoryId });

    render(
      <>
        <SubcategoryFields categories={[parentCategory]} subcategory={subcategory()} />
        <ModuleFields module={module()} subcategories={[subcategory()]} />
      </>,
    );

    expect(screen.getByLabelText("Catégorie parente")).toHaveValue(parentCategory.id);
    expect(screen.getByLabelText("Sous-catégorie")).toHaveValue(subcategory().id);
    expect(screen.getByLabelText("Locale")).toHaveAttribute("pattern", "[a-z]{2}(-[A-Z]{2})?");
    expect(screen.queryByLabelText("Contenu Markdown initial")).not.toBeInTheDocument();
  });

  it("renders initial markdown only when creating a module", () => {
    render(<ModuleFields subcategories={[subcategory()]} />);

    expect(screen.getByLabelText("Contenu Markdown initial")).toHaveValue("Brouillon initial.");
  });
});

describe("catalog public errors", () => {
  it("exposes stable public messages without treating unknown codes as catalog errors", () => {
    const error = new CatalogError(catalogErrorCodes.slugConflict, 409);

    expect(isCatalogError(error)).toBe(true);
    expect(error.status).toBe(409);
    expect(error.message).toMatch(/slug/i);
    expect(isCatalogError(new Error("plain"))).toBe(false);
    expect(getCatalogErrorMessage("UNKNOWN")).toBeNull();
  });
});

describe("shared error state", () => {
  it("renders retry and dashboard actions without exposing internals", () => {
    const retry = vi.fn();

    render(<ErrorState message="Erreur générique." onRetry={retry} title="Incident" />);

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Retour au tableau de bord" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
