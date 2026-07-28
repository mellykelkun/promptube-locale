import type { ReactNode } from "react";

import { AdminNavigation } from "@/shared/components/admin-navigation";
import { publicEnvironment } from "@/shared/config/public-environment";

type AdminShellProps = Readonly<{
  admin?: {
    email: string;
    name: string;
  };
  children: ReactNode;
  currentPath?: string;
}>;

export function AdminShell({ admin, children, currentPath = "/" }: AdminShellProps) {
  return (
    <div className="classic-admin min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="classic-window m-2 border-b px-3 py-3 lg:m-3 lg:min-h-[calc(100vh-1.5rem)] lg:border-b lg:px-3 lg:py-3">
        <div className="classic-titlebar mb-3 flex items-center gap-2 px-2 py-1.5">
          <div
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center border border-white/60 bg-[var(--accent-beige)] font-black text-[var(--accent-blue)]"
          >
            P
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              {publicEnvironment.applicationName}
            </p>
            <p className="text-[0.7rem] text-blue-50">Administration locale</p>
          </div>
        </div>
        <div className="classic-toolbar mb-3 px-2 py-1 text-xs">Console locale · MMC Promptube</div>
        <AdminNavigation currentPath={currentPath} />
      </aside>

      <div className="min-w-0 px-2 pb-4 lg:py-3 lg:pr-3 lg:pl-0">
        <header className="classic-window mb-3 flex min-h-16 items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[var(--text-secondary)] uppercase">
              Environnement local
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">
              {admin ? `${admin.name} · ${admin.email}` : "Fondation technique"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 border border-[var(--border-medium)] bg-[#e9f2e3] px-3 py-1.5 text-xs font-semibold text-[var(--success)]">
              <span
                aria-hidden="true"
                className="size-2 border border-[var(--success)] bg-[var(--success)]"
              />
              Socle actif
            </span>
            {admin ? (
              <form action="/api/admin/auth/logout" method="post">
                <button className="classic-button px-3 py-2 text-sm font-medium" type="submit">
                  Deconnexion
                </button>
              </form>
            ) : null}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl">{children}</main>
      </div>
    </div>
  );
}
