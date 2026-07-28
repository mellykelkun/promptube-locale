import { notFound } from "next/navigation";

import {
  archiveSubcategoryAction,
  restoreSubcategoryAction,
  updateSubcategoryAction,
} from "@/app/catalog/actions";
import { requireCompletedTwoFactor } from "@/server/auth/session";
import { isCatalogError } from "@/server/catalog/catalog-errors";
import { getCatalogSubcategory, listCatalogCategories } from "@/server/catalog/catalog-service";
import { AdminShell } from "@/shared/components/admin-shell";
import { CatalogBadge } from "@/modules/catalog/components/catalog-badge";
import { SubcategoryFields } from "@/modules/catalog/components/catalog-form-fields";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";
import { CatalogStatusMessage } from "@/modules/catalog/components/catalog-status-message";

import { getCatalogSearchParams, paramValue, type CatalogSearchParams } from "../../page-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SubcategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: CatalogSearchParams;
}) {
  const current = await requireCompletedTwoFactor();
  const { id } = await params;
  const query = await getCatalogSearchParams(searchParams);
  const [subcategory, categories] = await Promise.all([
    getCatalogSubcategory(id).catch((error) => {
      if (isCatalogError(error)) {
        notFound();
      }
      throw error;
    }),
    listCatalogCategories({ page: 1, pageSize: 50, status: "active" }),
  ]);

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-6">
        <CatalogPageHeader
          description={`Rattachée à ${subcategory.categoryName}.`}
          title={subcategory.name}
        />
        <div className="flex items-center gap-3">
          <CatalogBadge archivedAt={subcategory.archivedAt} />
          <span className="text-sm text-[var(--text-secondary)]">
            Révision {subcategory.revision}
          </span>
        </div>
        <CatalogStatusMessage
          error={paramValue(query, "error")}
          status={paramValue(query, "status")}
        />
        <form
          action={updateSubcategoryAction}
          className="classic-panel grid gap-4 p-5 md:grid-cols-2"
        >
          <SubcategoryFields categories={categories.items} subcategory={subcategory} />
          <button className="classic-button px-4 py-3 font-semibold md:col-span-2" type="submit">
            Enregistrer
          </button>
        </form>
        <form
          action={subcategory.archivedAt ? restoreSubcategoryAction : archiveSubcategoryAction}
          className="classic-panel p-5"
        >
          <input name="id" type="hidden" value={subcategory.id} />
          <input name="expectedRevision" type="hidden" value={subcategory.revision} />
          <button className="classic-button px-4 py-3 text-sm font-semibold" type="submit">
            {subcategory.archivedAt ? "Restaurer la sous-catégorie" : "Archiver la sous-catégorie"}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
