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
          <span className="text-sm text-slate-400">Révision module {module.revision}</span>
        </div>
        <CatalogStatusMessage
          error={paramValue(query, "error")}
          status={paramValue(query, "status")}
        />
        <form
          action={updateModuleAction}
          className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:grid-cols-2"
        >
          <ModuleFields module={module} subcategories={subcategories.items} />
          <button
            className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 md:col-span-2"
            type="submit"
          >
            Enregistrer le module
          </button>
        </form>
        <section className="space-y-4" aria-labelledby="versions-title">
          <h2 className="text-xl font-semibold text-white" id="versions-title">
            Versions
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Mise à jour</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {versions.map((version) => (
                  <tr className="bg-slate-950/60" key={version.id}>
                    <td className="px-4 py-3 font-medium text-white">v{version.versionNumber}</td>
                    <td className="px-4 py-3">
                      <CatalogBadge status={version.workflowStatus} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{version.updatedAt.toISOString()}</td>
                    <td className="px-4 py-3">
                      <Link
                        className="text-cyan-200 hover:text-cyan-100"
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
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <input name="id" type="hidden" value={module.id} />
          <input name="expectedRevision" type="hidden" value={module.revision} />
          <button
            className="rounded-lg border border-amber-300/50 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            type="submit"
          >
            {module.archivedAt ? "Restaurer le module" : "Archiver le module"}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
