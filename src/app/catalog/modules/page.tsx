import Link from "next/link";

import { requireCompletedTwoFactor } from "@/server/auth/session";
import { listCatalogModules } from "@/server/catalog/catalog-service";
import {
  catalogListFiltersSchema,
  catalogWorkflowStatusSchema,
} from "@/server/catalog/catalog-validation";
import { AdminShell } from "@/shared/components/admin-shell";
import { CatalogBadge } from "@/modules/catalog/components/catalog-badge";
import { CatalogFilterForm } from "@/modules/catalog/components/catalog-filter-form";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";

import { getCatalogSearchParams, paramValue, type CatalogSearchParams } from "../page-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ModulesPage({
  searchParams,
}: {
  searchParams?: CatalogSearchParams;
}) {
  const current = await requireCompletedTwoFactor();
  const raw = await getCatalogSearchParams(searchParams);
  const filters = catalogListFiltersSchema.parse({
    page: paramValue(raw, "page"),
    search: paramValue(raw, "search"),
    status: paramValue(raw, "status"),
  });
  const workflowCandidate = paramValue(raw, "workflowStatus");
  const workflowStatus = workflowCandidate
    ? catalogWorkflowStatusSchema.safeParse(workflowCandidate).data
    : undefined;
  const page = await listCatalogModules({ ...filters, workflowStatus });

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-6">
        <CatalogPageHeader
          actionHref="/catalog/modules/new"
          actionLabel="Nouveau module"
          description="Créer et suivre les modules locaux. APPROVED signifie uniquement approuvé localement."
          title="Modules"
        />
        <CatalogFilterForm
          defaultSearch={filters.search}
          defaultStatus={filters.status}
          showWorkflow
          workflowStatus={workflowStatus}
        />
        <div className="classic-panel overflow-x-auto">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Sous-catégorie</th>
                <th className="px-4 py-3">Locale</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((module) => (
                <tr key={module.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)]">{module.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{module.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {module.categoryName} / {module.subcategoryName}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{module.locale}</td>
                  <td className="px-4 py-3">
                    <CatalogBadge archivedAt={module.archivedAt} status={module.latestStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="classic-action inline-flex px-2 py-1 text-xs"
                      href={`/catalog/modules/${module.id}`}
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
              {page.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-[var(--text-secondary)]" colSpan={5}>
                    Aucun module.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
