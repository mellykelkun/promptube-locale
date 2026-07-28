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
    <main className="classic-admin grid min-h-screen place-items-center px-5 py-10">
      <section className="classic-window w-full max-w-md overflow-hidden">
        <div className="classic-titlebar px-3 py-1.5 text-sm">Promptube Admin</div>
        <div className="p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent-blue)] uppercase">
            Accès local
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Connexion administrateur
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Acces local prive. Aucune inscription publique n&apos;est disponible.
          </p>
          <div className="mt-5">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
