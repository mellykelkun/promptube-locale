import type { ReactNode } from "react";

import { AdminNavigation } from "@/shared/components/admin-navigation";
import { publicEnvironment } from "@/shared/config/public-environment";

type AdminShellProps = Readonly<{
  children: ReactNode;
}>;

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:grid lg:grid-cols-[18rem_1fr]">
      <aside className="border-b border-slate-800 bg-slate-950 px-4 py-5 lg:min-h-screen lg:border-r lg:border-b-0 lg:px-5 lg:py-7">
        <div className="mb-7 flex items-center gap-3 px-2">
          <div
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-300 font-black text-slate-950 shadow-[0_0_2rem_rgba(103,232,249,0.2)]"
          >
            P
          </div>
          <div>
            <p className="font-semibold tracking-tight text-white">
              {publicEnvironment.applicationName}
            </p>
            <p className="text-xs text-slate-400">Administration locale</p>
          </div>
        </div>
        <AdminNavigation />
      </aside>

      <div className="min-w-0">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/80 px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-medium text-slate-400">Environnement local</p>
            <p className="text-sm text-slate-200">Fondation technique</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
            <span aria-hidden="true" className="size-2 rounded-full bg-emerald-300" />
            Socle actif
          </span>
        </header>

        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
