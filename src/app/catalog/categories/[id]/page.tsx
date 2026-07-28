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
          <span className="text-sm text-slate-400">Révision {category.revision}</span>
        </div>
        <CatalogStatusMessage
          error={paramValue(query, "error")}
          status={paramValue(query, "status")}
        />
        <form
          action={updateCategoryAction}
          className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:grid-cols-2"
        >
          <CategoryFields category={category} />
          <button
            className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 md:col-span-2"
            type="submit"
          >
            Enregistrer
          </button>
        </form>
        <form
          action={category.archivedAt ? restoreCategoryAction : archiveCategoryAction}
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <input name="id" type="hidden" value={category.id} />
          <input name="expectedRevision" type="hidden" value={category.revision} />
          <button
            className="rounded-lg border border-amber-300/50 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            type="submit"
          >
            {category.archivedAt ? "Restaurer la catégorie" : "Archiver la catégorie"}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
