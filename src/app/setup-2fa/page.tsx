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
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 py-10 text-slate-100">
      <section className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-cyan-300 uppercase">
          Securite obligatoire
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          Activer l&apos;authentification TOTP
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Le tableau de bord reste inaccessible tant que le TOTP n&apos;est pas active.
        </p>
        <div className="mt-6">
          <TotpSetupForm />
        </div>
      </section>
    </main>
  );
}
