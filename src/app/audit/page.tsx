import { requireCompletedTwoFactor } from "@/server/auth/session";
import { listRecentAuditEvents } from "@/server/audit/audit-service";
import { AdminShell } from "@/shared/components/admin-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AuditPage() {
  const current = await requireCompletedTwoFactor();
  const events = await listRecentAuditEvents();

  return (
    <AdminShell admin={current.admin}>
      <section aria-labelledby="audit-title" className="space-y-6">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-cyan-300 uppercase">Audit</p>
          <h1 className="mt-3 text-3xl font-semibold text-white" id="audit-title">
            Evenements administratifs
          </h1>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resultat</th>
                <th className="px-4 py-3">Cible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.map((event) => (
                <tr className="bg-slate-950/60" key={event.id}>
                  <td className="px-4 py-3 text-slate-300">{event.createdAt.toISOString()}</td>
                  <td className="px-4 py-3 font-medium text-white">{event.action}</td>
                  <td className="px-4 py-3 text-slate-300">{event.outcome}</td>
                  <td className="px-4 py-3 text-slate-400">{event.targetType ?? "systeme"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
