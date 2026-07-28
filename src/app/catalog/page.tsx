import Link from "next/link";

import { requireCompletedTwoFactor } from "@/server/auth/session";
import {
  listCatalogCategories,
  listCatalogModules,
  listCatalogSubcategories,
} from "@/server/catalog/catalog-service";
import { AdminShell } from "@/shared/components/admin-shell";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CatalogHomePage() {
  const current = await requireCompletedTwoFactor();
  const [categories, subcategories, modules] = await Promise.all([
    listCatalogCategories({ page: 1, pageSize: 1, status: "all" }),
    listCatalogSubcategories({ page: 1, pageSize: 1, status: "all" }),
    listCatalogModules({ page: 1, pageSize: 1, status: "all" }),
  ]);

  const cards = [
    {
      count: categories.total,
      href: "/catalog/categories",
      label: "Catégories",
      text: "Regroupement principal du catalogue local.",
    },
    {
      count: subcategories.total,
      href: "/catalog/subcategories",
      label: "Sous-catégories",
      text: "Organisation interne rattachée à une catégorie.",
    },
    {
      count: modules.total,
      href: "/catalog/modules",
      label: "Modules",
      text: "Identités stables et versions éditoriales locales.",
    },
  ];

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-8" aria-labelledby="catalog-title">
        <CatalogPageHeader
          description="Gérer localement les catégories, sous-catégories, modules et versions. Une version approuvée ici n’est pas publiée en production."
          title="Catalogue local"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Link
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-cyan-300/50 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              href={card.href}
              key={card.href}
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{card.count}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.text}</p>
            </Link>
          ))}
        </div>
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100">
          Le catalogue reste local. Aucun ZIP, aucune image, aucun stockage MinIO métier et aucune
          publication vers <code>promptube-prod</code> ne sont utilisés dans cette phase.
        </div>
      </section>
    </AdminShell>
  );
}
