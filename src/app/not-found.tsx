import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-16 text-slate-100">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold tracking-[0.16em] text-cyan-300 uppercase">
          Erreur 404
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Page introuvable</h1>
        <p className="mt-3 leading-7 text-slate-300">
          La page demandée n’existe pas dans le socle d’administration.
        </p>
        <Link
          className="mt-7 inline-flex rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          href="/"
        >
          Retour au tableau de bord
        </Link>
      </section>
    </main>
  );
}
