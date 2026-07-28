import { redirect } from "next/navigation";

import { TotpSetupForm } from "@/modules/auth/components/totp-setup-form";
import { requireAdminSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SetupTwoFactorPage() {
  const current = await requireAdminSession();

  if (current.admin.twoFactorEnabled) {
    redirect("/");
  }

  return (
    <main className="classic-admin grid min-h-screen place-items-center px-5 py-10">
      <section className="classic-window w-full max-w-xl overflow-hidden">
        <div className="classic-titlebar px-3 py-1.5 text-sm">Sécurité obligatoire</div>
        <div className="p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent-blue)] uppercase">
            Securite obligatoire
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Activer l&apos;authentification TOTP
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Le tableau de bord reste inaccessible tant que le TOTP n&apos;est pas active.
          </p>
          <div className="mt-5">
            <TotpSetupForm />
          </div>
        </div>
      </section>
    </main>
  );
}
