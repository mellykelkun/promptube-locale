"use client";

import Link from "next/link";

type ErrorStateProps = Readonly<{
  message: string;
  onRetry?: () => void;
  title: string;
}>;

export function ErrorState({ message, onRetry, title }: ErrorStateProps) {
  return (
    <main className="classic-admin grid min-h-screen place-items-center px-6 py-16">
      <section className="classic-window w-full max-w-lg overflow-hidden">
        <div className="classic-titlebar px-3 py-1.5 text-sm">Promptube Admin</div>
        <div className="p-5">
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-[var(--accent-blue)] uppercase">
            Erreur applicative
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-[var(--text-secondary)]">{message}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {onRetry ? (
              <button
                className="classic-button px-4 py-2.5 text-sm font-semibold"
                onClick={onRetry}
                type="button"
              >
                Réessayer
              </button>
            ) : null}
            <Link className="classic-action inline-flex px-4 py-2.5 text-sm font-semibold" href="/">
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
