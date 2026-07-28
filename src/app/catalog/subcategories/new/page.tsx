import { createSubcategoryAction } from "@/app/catalog/actions";
import { requireCompletedTwoFactor } from "@/server/auth/session";
import { listCatalogCategories } from "@/server/catalog/catalog-service";
import { AdminShell } from "@/shared/components/admin-shell";
import { SubcategoryFields } from "@/modules/catalog/components/catalog-form-fields";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";
import { CatalogStatusMessage } from "@/modules/catalog/components/catalog-status-message";

import { getCatalogSearchParams, paramValue, type CatalogSearchParams } from "../../page-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewSubcategoryPage({
  searchParams,
}: {
  searchParams?: CatalogSearchParams;
}) {
  const current = await requireCompletedTwoFactor();
  const params = await getCatalogSearchParams(searchParams);
  const categories = await listCatalogCategories({ page: 1, pageSize: 50, status: "active" });

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-6">
        <CatalogPageHeader
          description="Une sous-catégorie active ne peut être rattachée qu’à une catégorie active."
          title="Nouvelle sous-catégorie"
        />
        <CatalogStatusMessage error={paramValue(params, "error")} />
        <form
          action={createSubcategoryAction}
          className="classic-panel grid gap-4 p-5 md:grid-cols-2"
        >
          <SubcategoryFields categories={categories.items} />
          <button className="classic-button px-4 py-3 font-semibold md:col-span-2" type="submit">
            Créer la sous-catégorie
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
