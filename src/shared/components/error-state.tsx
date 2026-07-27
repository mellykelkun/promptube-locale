"use client";

import Link from "next/link";

type ErrorStateProps = Readonly<{
  message: string;
  onRetry?: () => void;
  title: string;
}>;

export function ErrorState({ message, onRetry, title }: ErrorStateProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-16 text-slate-100">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="mb-3 text-sm font-semibold tracking-[0.16em] text-cyan-300 uppercase">
          Promptube Admin
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-3 leading-7 text-slate-300">{message}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {onRetry ? (
            <button
              className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              onClick={onRetry}
              type="button"
            >
              Réessayer
            </button>
          ) : null}
          <Link
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            href="/"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </section>
    </main>
  );
}
