"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function TotpVerifyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/2fa/verify", {
      body: JSON.stringify({ code: formData.get("code") }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    setPending(false);

    if (!response.ok) {
      setError("Code invalide ou verification impossible.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <label className="text-sm font-medium text-slate-200" htmlFor="code">
        Code TOTP ou code de secours
      </label>
      <input
        autoComplete="one-time-code"
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none transition focus:border-cyan-300"
        id="code"
        name="code"
        required
      />
      {error ? (
        <p aria-live="polite" className="text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      <button
        className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950"
        disabled={pending}
        type="submit"
      >
        Verifier
      </button>
    </form>
  );
}
