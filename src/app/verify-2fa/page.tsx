import { TotpVerifyForm } from "@/modules/auth/components/totp-verify-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function VerifyTwoFactorPage() {
  return (
    <main className="classic-admin grid min-h-screen place-items-center px-5 py-10">
      <section className="classic-window w-full max-w-md overflow-hidden">
        <div className="classic-titlebar px-3 py-1.5 text-sm">Second facteur</div>
        <div className="p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent-blue)] uppercase">
            Second facteur
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Verification TOTP
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Saisis le code genere par ton application d&apos;authentification.
          </p>
          <div className="mt-5">
            <TotpVerifyForm />
          </div>
        </div>
      </section>
    </main>
  );
}
