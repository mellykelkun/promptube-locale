const FOUNDATION_AREAS = [
  {
    description: "Contrôles lint, types, tests, couverture, formatage et build reproductibles.",
    title: "Qualité automatisée",
  },
  {
    description: "Configuration typée, erreurs sûres, corrélation et logs structurés.",
    title: "Services transverses",
  },
  {
    description: "Healthcheck non sensible et en-têtes HTTP adaptés au socle local.",
    title: "Exploitation minimale",
  },
] as const;

const DEFERRED_FEATURES = [
  "ZIP, stockage objet métier et traitement d’image",
  "Publication vers la production",
  "Utilisateurs, commandes et paiements",
  "RBAC, audit métier et CSP finale",
] as const;

export function DashboardOverview() {
  return (
    <div className="space-y-10">
      <section aria-labelledby="dashboard-title">
        <p className="text-sm font-semibold tracking-[0.16em] text-cyan-300 uppercase">
          Tableau de bord
        </p>
        <div className="mt-3 max-w-3xl">
          <h1
            className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            id="dashboard-title"
          >
            Fondation de l’administration Promptube
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
            Cet espace valide le socle technique local. Il ne contient encore aucune donnée ni
            fonctionnalité métier.
          </p>
        </div>
      </section>

      <section aria-labelledby="foundation-status-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">État actuel</p>
            <h2 className="text-xl font-semibold text-white" id="foundation-status-title">
              Capacités du socle
            </h2>
          </div>
          <span className="text-sm font-medium text-emerald-300">Phase technique</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FOUNDATION_AREAS.map((area, index) => (
            <article
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
              key={area.title}
            >
              <span className="text-xs font-bold tracking-[0.16em] text-cyan-300">
                0{index + 1}
              </span>
              <h3 className="mt-4 font-semibold text-white">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{area.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="deferred-features-title"
        className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="text-sm font-semibold text-amber-200">Périmètre maîtrisé</p>
            <h2 className="mt-2 text-xl font-semibold text-white" id="deferred-features-title">
              Fonctionnalités volontairement différées
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Ces capacités nécessitent leurs propres décisions, données et contrôles avant toute
              implémentation.
            </p>
          </div>
          <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            {DEFERRED_FEATURES.map((feature) => (
              <li
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3"
                key={feature}
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
