import { TotpVerifyForm } from "@/modules/auth/components/totp-verify-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function VerifyTwoFactorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-cyan-300 uppercase">
          Second facteur
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Verification TOTP</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Saisis le code genere par ton application d&apos;authentification.
        </p>
        <div className="mt-6">
          <TotpVerifyForm />
        </div>
      </section>
    </main>
  );
}
