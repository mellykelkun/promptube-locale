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
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="code">
        Code TOTP ou code de secours
      </label>
      <input
        autoComplete="one-time-code"
        className="px-3 py-2 text-sm"
        id="code"
        name="code"
        required
      />
      {error ? (
        <p
          aria-live="polite"
          className="border border-[var(--danger)] bg-[#fff0f0] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
      <button className="classic-button px-4 py-2 font-semibold" disabled={pending} type="submit">
        Verifier
      </button>
    </form>
  );
}
