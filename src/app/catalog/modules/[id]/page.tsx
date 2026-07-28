import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveModuleAction,
  restoreModuleAction,
  updateModuleAction,
} from "@/app/catalog/actions";
import { requireCompletedTwoFactor } from "@/server/auth/session";
import { isCatalogError } from "@/server/catalog/catalog-errors";
import { getCatalogModule, listCatalogSubcategories } from "@/server/catalog/catalog-service";
import { AdminShell } from "@/shared/components/admin-shell";
import { CatalogBadge } from "@/modules/catalog/components/catalog-badge";
import { ModuleFields } from "@/modules/catalog/components/catalog-form-fields";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";
import { CatalogStatusMessage } from "@/modules/catalog/components/catalog-status-message";

import { getCatalogSearchParams, paramValue, type CatalogSearchParams } from "../../page-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ModuleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: CatalogSearchParams;
}) {
  const current = await requireCompletedTwoFactor();
  const { id } = await params;
  const query = await getCatalogSearchParams(searchParams);
  const [{ module, versions }, subcategories] = await Promise.all([
    getCatalogModule(id).catch((error) => {
      if (isCatalogError(error)) {
        notFound();
      }
      throw error;
    }),
    listCatalogSubcategories({ page: 1, pageSize: 50, status: "active" }),
  ]);

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-8">
        <CatalogPageHeader
          description={`${module.categoryName} / ${module.subcategoryName}. APPROVED reste une validation locale, pas une publication.`}
          title={module.title}
        />
        <div className="flex items-center gap-3">
          <CatalogBadge archivedAt={module.archivedAt} status={module.latestStatus} />
          <span className="text-sm text-[var(--text-secondary)]">
            Révision module {module.revision}
          </span>
        </div>
        <CatalogStatusMessage
          error={paramValue(query, "error")}
          status={paramValue(query, "status")}
        />
        <form action={updateModuleAction} className="classic-panel grid gap-4 p-5 md:grid-cols-2">
          <ModuleFields module={module} subcategories={subcategories.items} />
          <button className="classic-button px-4 py-3 font-semibold md:col-span-2" type="submit">
            Enregistrer le module
          </button>
        </form>
        <section className="space-y-4" aria-labelledby="versions-title">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="versions-title">
            Versions
          </h2>
          <div className="classic-panel overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Mise à jour</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id}>
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      v{version.versionNumber}
                    </td>
                    <td className="px-4 py-3">
                      <CatalogBadge status={version.workflowStatus} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {version.updatedAt.toISOString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="classic-action inline-flex px-2 py-1 text-xs"
                        href={`/catalog/modules/${module.id}/versions/${version.id}`}
                      >
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <form
          action={module.archivedAt ? restoreModuleAction : archiveModuleAction}
          className="classic-panel p-5"
        >
          <input name="id" type="hidden" value={module.id} />
          <input name="expectedRevision" type="hidden" value={module.revision} />
          <button className="classic-button px-4 py-3 text-sm font-semibold" type="submit">
            {module.archivedAt ? "Restaurer le module" : "Archiver le module"}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
