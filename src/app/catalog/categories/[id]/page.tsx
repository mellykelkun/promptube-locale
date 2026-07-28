import { notFound } from "next/navigation";

import {
  archiveCategoryAction,
  restoreCategoryAction,
  updateCategoryAction,
} from "@/app/catalog/actions";
import { requireCompletedTwoFactor } from "@/server/auth/session";
import { isCatalogError } from "@/server/catalog/catalog-errors";
import { getCatalogCategory } from "@/server/catalog/catalog-service";
import { AdminShell } from "@/shared/components/admin-shell";
import { CatalogBadge } from "@/modules/catalog/components/catalog-badge";
import { CategoryFields } from "@/modules/catalog/components/catalog-form-fields";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";
import { CatalogStatusMessage } from "@/modules/catalog/components/catalog-status-message";

import { getCatalogSearchParams, paramValue, type CatalogSearchParams } from "../../page-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: CatalogSearchParams;
}) {
  const current = await requireCompletedTwoFactor();
  const { id } = await params;
  const query = await getCatalogSearchParams(searchParams);
  const category = await getCatalogCategory(id).catch((error) => {
    if (isCatalogError(error)) {
      notFound();
    }
    throw error;
  });

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-6">
        <CatalogPageHeader
          description="Modification avec verrouillage optimiste par révision."
          title={category.name}
        />
        <div className="flex items-center gap-3">
          <CatalogBadge archivedAt={category.archivedAt} />
          <span className="text-sm text-[var(--text-secondary)]">Révision {category.revision}</span>
        </div>
        <CatalogStatusMessage
          error={paramValue(query, "error")}
          status={paramValue(query, "status")}
        />
        <form action={updateCategoryAction} className="classic-panel grid gap-4 p-5 md:grid-cols-2">
          <CategoryFields category={category} />
          <button className="classic-button px-4 py-3 font-semibold md:col-span-2" type="submit">
            Enregistrer
          </button>
        </form>
        <form
          action={category.archivedAt ? restoreCategoryAction : archiveCategoryAction}
          className="classic-panel p-5"
        >
          <input name="id" type="hidden" value={category.id} />
          <input name="expectedRevision" type="hidden" value={category.revision} />
          <button className="classic-button px-4 py-3 text-sm font-semibold" type="submit">
            {category.archivedAt ? "Restaurer la catégorie" : "Archiver la catégorie"}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
