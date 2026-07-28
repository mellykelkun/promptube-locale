import { FieldGroup, StatusBar, Tabs, WindowPanel } from "@/shared/components/classic-ui";

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
    <div className="space-y-4">
      <section aria-labelledby="dashboard-title">
        <WindowPanel
          status="État : prêt pour administration locale · Publication production désactivée"
          title="Promptube Admin — Tableau de bord"
          toolbar={
            <>
              <span className="border-r border-[var(--border-medium)] pr-2 font-semibold">
                Fichier
              </span>
              <span>Affichage</span>
              <span>Outils</span>
              <span>Aide</span>
            </>
          }
        >
          <Tabs tabs={["Résumé", "Contrôles", "Périmètre"]} />
          <div className="mt-4 max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent-blue)] uppercase">
              Tableau de bord
            </p>
            <h1
              className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl"
              id="dashboard-title"
            >
              Fondation de l’administration Promptube
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Cet espace valide le socle technique local. Il ne contient encore aucune donnée ni
              fonctionnalité métier.
            </p>
          </div>
        </WindowPanel>
      </section>

      <section aria-labelledby="foundation-status-title">
        <WindowPanel
          status="Contrôles locaux uniquement · Aucune connexion à promptube-prod"
          title="Capacités du socle"
          toolbar={<span>Vue : icônes détaillées</span>}
        >
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">État actuel</p>
              <h2
                className="text-xl font-semibold text-[var(--text-primary)]"
                id="foundation-status-title"
              >
                Capacités du socle
              </h2>
            </div>
            <span className="border border-[var(--success)] bg-[#e9f2e3] px-2 py-1 text-xs font-semibold text-[var(--success)]">
              Phase technique
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {FOUNDATION_AREAS.map((area, index) => (
              <article className="classic-panel p-4" key={area.title}>
                <span className="text-xs font-bold tracking-[0.16em] text-[var(--accent-blue)]">
                  0{index + 1}
                </span>
                <h3 className="mt-3 font-semibold text-[var(--text-primary)]">{area.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {area.description}
                </p>
              </article>
            ))}
          </div>
        </WindowPanel>
      </section>

      <section aria-labelledby="deferred-features-title">
        <FieldGroup>
          <legend className="px-1 text-sm">Périmètre maîtrisé</legend>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <h2
                className="text-xl font-semibold text-[var(--text-primary)]"
                id="deferred-features-title"
              >
                Fonctionnalités volontairement différées
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Ces capacités nécessitent leurs propres décisions, données et contrôles avant toute
                implémentation.
              </p>
            </div>
            <ul className="grid gap-2 text-sm text-[var(--text-primary)] sm:grid-cols-2">
              {DEFERRED_FEATURES.map((feature) => (
                <li className="classic-panel bg-[#fffdf4] px-3 py-2" key={feature}>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </FieldGroup>
      </section>

      <StatusBar>
        Console locale Promptube · Données métier différées · Accès administrateur protégé
      </StatusBar>
    </div>
  );
}
