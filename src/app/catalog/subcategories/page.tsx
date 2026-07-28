import Link from "next/link";

import { requireCompletedTwoFactor } from "@/server/auth/session";
import { listCatalogSubcategories } from "@/server/catalog/catalog-service";
import { catalogListFiltersSchema } from "@/server/catalog/catalog-validation";
import { AdminShell } from "@/shared/components/admin-shell";
import { CatalogBadge } from "@/modules/catalog/components/catalog-badge";
import { CatalogFilterForm } from "@/modules/catalog/components/catalog-filter-form";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";

import { getCatalogSearchParams, paramValue, type CatalogSearchParams } from "../page-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SubcategoriesPage({
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
  const page = await listCatalogSubcategories(filters);

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-6">
        <CatalogPageHeader
          actionHref="/catalog/subcategories/new"
          actionLabel="Nouvelle sous-catégorie"
          description="Organiser les modules sous une catégorie active."
          title="Sous-catégories"
        />
        <CatalogFilterForm defaultSearch={filters.search} defaultStatus={filters.status} />
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {page.items.map((subcategory) => (
                <tr className="bg-slate-950/60" key={subcategory.id}>
                  <td className="px-4 py-3 font-medium text-white">{subcategory.name}</td>
                  <td className="px-4 py-3 text-slate-300">{subcategory.categoryName}</td>
                  <td className="px-4 py-3 text-slate-300">{subcategory.slug}</td>
                  <td className="px-4 py-3">
                    <CatalogBadge archivedAt={subcategory.archivedAt} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-cyan-200 hover:text-cyan-100"
                      href={`/catalog/subcategories/${subcategory.id}`}
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
              {page.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={5}>
                    Aucune sous-catégorie.
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
