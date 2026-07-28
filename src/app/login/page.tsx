import { redirect } from "next/navigation";

import { LoginForm } from "@/modules/auth/components/login-form";
import { getOptionalAdminSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const current = await getOptionalAdminSession();

  if (current?.admin.twoFactorEnabled) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-cyan-300 uppercase">
          Promptube Admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Connexion administrateur</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Acces local prive. Aucune inscription publique n&apos;est disponible.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
