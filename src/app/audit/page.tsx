import { requireCompletedTwoFactor } from "@/server/auth/session";
import { listRecentAuditEvents } from "@/server/audit/audit-service";
import { AdminShell } from "@/shared/components/admin-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AuditPage() {
  const current = await requireCompletedTwoFactor();
  const events = await listRecentAuditEvents();

  return (
    <AdminShell admin={current.admin} currentPath="/audit">
      <section aria-labelledby="audit-title" className="space-y-6">
        <div className="classic-window overflow-hidden">
          <div className="classic-titlebar px-3 py-1.5 text-sm">Audit</div>
          <div className="p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent-blue)] uppercase">
              Audit
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]" id="audit-title">
              Evenements administratifs
            </h1>
          </div>
        </div>
        <div className="classic-panel overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resultat</th>
                <th className="px-4 py-3">Cible</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {event.createdAt.toISOString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    {event.action}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{event.outcome}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {event.targetType ?? "systeme"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
