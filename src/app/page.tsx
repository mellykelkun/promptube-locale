import { DashboardOverview } from "@/modules/dashboard/components/dashboard-overview";
import { requireCompletedTwoFactor } from "@/server/auth/session";
import { AdminShell } from "@/shared/components/admin-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const current = await requireCompletedTwoFactor();

  return (
    <AdminShell admin={current.admin} currentPath="/">
      <DashboardOverview />
    </AdminShell>
  );
}
