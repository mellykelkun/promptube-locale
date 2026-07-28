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
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="email">
          Email administrateur
        </label>
        <input
          autoComplete="email"
          className="px-3 py-2 text-sm"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="password">
          Mot de passe
        </label>
        <input
          autoComplete="current-password"
          className="px-3 py-2 text-sm"
          id="password"
          maxLength={128}
          minLength={14}
          name="password"
          required
          type="password"
        />
      </div>
      {error ? (
        <p
          aria-live="polite"
          className="border border-[var(--danger)] bg-[#fff0f0] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
      <button
        className="classic-button px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
