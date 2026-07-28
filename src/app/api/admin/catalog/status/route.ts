import { NextResponse } from "next/server";

import { requireCompletedTwoFactor } from "@/server/auth/session";
import { assertCatalogCapability } from "@/server/catalog/catalog-policy";
import {
  listCatalogCategories,
  listCatalogModules,
  listCatalogSubcategories,
} from "@/server/catalog/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const current = await requireCompletedTwoFactor();
  assertCatalogCapability(
    {
      id: current.admin.id,
      role: current.admin.role,
      twoFactorEnabled: current.admin.twoFactorEnabled,
    },
    "catalog:read",
  );

  const [categories, subcategories, modules] = await Promise.all([
    listCatalogCategories({ page: 1, pageSize: 1, status: "all" }),
    listCatalogSubcategories({ page: 1, pageSize: 1, status: "all" }),
    listCatalogModules({ page: 1, pageSize: 1, status: "all" }),
  ]);

  return NextResponse.json(
    {
      categories: categories.total,
      modules: modules.total,
      subcategories: subcategories.total,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
