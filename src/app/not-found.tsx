import Link from "next/link";

export default function NotFound() {
  return (
    <main className="classic-admin grid min-h-screen place-items-center px-6 py-16">
      <section className="classic-window w-full max-w-lg overflow-hidden">
        <div className="classic-titlebar px-3 py-1.5 text-sm">Erreur 404</div>
        <div className="p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent-blue)] uppercase">
            Erreur 404
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            Page introuvable
          </h1>
          <p className="mt-3 leading-7 text-[var(--text-secondary)]">
            La page demandée n’existe pas dans le socle d’administration.
          </p>
          <Link
            className="classic-action mt-7 inline-flex px-4 py-2.5 text-sm font-semibold"
            href="/"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </section>
    </main>
  );
}
