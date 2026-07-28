import { createModuleAction } from "@/app/catalog/actions";
import { requireCompletedTwoFactor } from "@/server/auth/session";
import { listCatalogSubcategories } from "@/server/catalog/catalog-service";
import { AdminShell } from "@/shared/components/admin-shell";
import { ModuleFields } from "@/modules/catalog/components/catalog-form-fields";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";
import { CatalogStatusMessage } from "@/modules/catalog/components/catalog-status-message";

import { getCatalogSearchParams, paramValue, type CatalogSearchParams } from "../../page-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewModulePage({
  searchParams,
}: {
  searchParams?: CatalogSearchParams;
}) {
  const current = await requireCompletedTwoFactor();
  const params = await getCatalogSearchParams(searchParams);
  const subcategories = await listCatalogSubcategories({ page: 1, pageSize: 50, status: "active" });

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-6">
        <CatalogPageHeader
          description="La création d’un module crée aussi une version 1 en brouillon. Aucun fichier ni publication n’est ajouté."
          title="Nouveau module"
        />
        <CatalogStatusMessage error={paramValue(params, "error")} />
        <form action={createModuleAction} className="classic-panel grid gap-4 p-5 md:grid-cols-2">
          <ModuleFields subcategories={subcategories.items} />
          <button className="classic-button px-4 py-3 font-semibold md:col-span-2" type="submit">
            Créer le module
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
