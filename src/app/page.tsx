import { DashboardOverview } from "@/modules/dashboard/components/dashboard-overview";
import { AdminShell } from "@/shared/components/admin-shell";

export default function DashboardPage() {
  return (
    <AdminShell>
      <DashboardOverview />
    </AdminShell>
  );
}
