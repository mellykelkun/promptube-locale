"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const genericError = "identifiants invalides ou connexion impossible";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/auth/login", {
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response
      .clone()
      .json()
      .catch(() => null);

    setPending(false);

    if (!response.ok) {
      setError(genericError);
      return;
    }

    if (body?.twoFactorRedirect) {
      router.replace("/verify-2fa");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="email">
          Email administrateur
        </label>
        <input
          autoComplete="email"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none transition focus:border-cyan-300"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="password">
          Mot de passe
        </label>
        <input
          autoComplete="current-password"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none transition focus:border-cyan-300"
          id="password"
          maxLength={128}
          minLength={14}
          name="password"
          required
          type="password"
        />
      </div>
      {error ? (
        <p aria-live="polite" className="text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      <button
        className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
