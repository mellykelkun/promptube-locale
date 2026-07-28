"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SetupState =
  | { status: "idle" }
  | { error: string; status: "error" }
  | { backupCodes: string[]; qrCodeDataUrl: string; status: "ready"; totpURI: string };

export function TotpSetupForm() {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupState>({ status: "idle" });
  const [pending, setPending] = useState(false);

  async function startSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/2fa/setup", {
      body: JSON.stringify({ password: formData.get("password") }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = await response.json().catch(() => null);
    setPending(false);

    if (!response.ok || !body?.qrCodeDataUrl) {
      setSetup({ error: "Activation impossible.", status: "error" });
      return;
    }

    setSetup({
      backupCodes: body.backupCodes,
      qrCodeDataUrl: body.qrCodeDataUrl,
      status: "ready",
      totpURI: body.totpURI,
    });
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/2fa/verify", {
      body: JSON.stringify({ code: formData.get("code") }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setPending(false);

    if (!response.ok) {
      setSetup({ error: "Code invalide ou verification impossible.", status: "error" });
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      {setup.status === "ready" ? (
        <>
          <div className="rounded-lg border border-slate-800 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="QR code TOTP Promptube Admin"
              className="size-48"
              height={192}
              src={setup.qrCodeDataUrl}
              width={192}
            />
          </div>
          <p className="break-all text-xs text-slate-400">{setup.totpURI}</p>
          <section
            aria-labelledby="backup-codes-title"
            className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4"
          >
            <h2 className="font-semibold text-amber-100" id="backup-codes-title">
              Codes de secours a sauvegarder maintenant
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-amber-50">
              {setup.backupCodes.map((code) => (
                <li className="font-mono" key={code}>
                  {code}
                </li>
              ))}
            </ul>
          </section>
          <form className="grid gap-4" onSubmit={verifyCode}>
            <label className="text-sm font-medium text-slate-200" htmlFor="code">
              Code TOTP
            </label>
            <input
              autoComplete="one-time-code"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none transition focus:border-cyan-300"
              id="code"
              inputMode="numeric"
              name="code"
              required
            />
            <button
              className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950"
              disabled={pending}
              type="submit"
            >
              Activer le TOTP
            </button>
          </form>
        </>
      ) : (
        <form className="grid gap-4" onSubmit={startSetup}>
          <label className="text-sm font-medium text-slate-200" htmlFor="password">
            Mot de passe courant
          </label>
          <input
            autoComplete="current-password"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none transition focus:border-cyan-300"
            id="password"
            name="password"
            required
            type="password"
          />
          <button
            className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950"
            disabled={pending}
            type="submit"
          >
            Generer le secret TOTP
          </button>
        </form>
      )}
      {setup.status === "error" ? (
        <p aria-live="polite" className="text-sm text-rose-300">
          {setup.error}
        </p>
      ) : null}
    </div>
  );
}
