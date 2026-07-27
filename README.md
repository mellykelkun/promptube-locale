# Promptube Admin locale

Application Next.js privée destinée à l’administration locale de Promptube. Cette version constitue
uniquement la fondation technique : elle fournit la structure, les contrôles qualité, le
healthcheck, la gestion sûre des erreurs et une interface neutre. Elle ne manipule encore aucune
donnée métier.

## Prérequis

- Node.js `24.18.0` ;
- npm `11.16.0` ;
- aucun service Docker ou base de données n’est requis pour cette phase.

La version Node est définie par le fichier `.nvmrc` situé dans le dossier parent. Depuis ce dépôt :

```bash
nvm use ../
node --version
npm --version
```

Les versions attendues sont `v24.18.0` et `11.16.0`.

## Installation

Le dépôt utilise exclusivement npm et son lockfile :

```bash
npm ci
```

`npm ci` doit être préféré pour reproduire exactement les dépendances du `package-lock.json`. Ne
jamais exécuter `npm audit fix` ou `npm audit fix --force` sans analyse et validation dédiées.

## Démarrage local

Inventorier d’abord les ports disponibles, puis lier le serveur à l’interface locale :

```bash
npm run dev -- --hostname 127.0.0.1 --port <port-libre>
```

Aucun port précis n’est présumé libre et aucun serveur persistant n’est lancé par les scripts de
contrôle.

## Scripts

| Script                  | Rôle                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Serveur de développement Next.js                            |
| `npm run build`         | Build de production                                         |
| `npm run start`         | Serveur du build, à lancer explicitement                    |
| `npm run lint`          | Analyse ESLint du projet                                    |
| `npm run typecheck`     | Vérification TypeScript sans émission                       |
| `npm run test`          | Tests Vitest en exécution unique                            |
| `npm run test:watch`    | Tests Vitest en mode interactif                             |
| `npm run test:coverage` | Tests avec rapport V8 dans `coverage/`                      |
| `npm run format`        | Formatage Prettier des fichiers suivis par la configuration |
| `npm run format:check`  | Vérification du formatage sans modification                 |
| `npm run check`         | Format (contrôle seul), lint, types, tests puis build       |
| `npm run audit`         | Audit npm complet, sans correction automatique              |
| `npm run audit:prod`    | Audit npm limité aux dépendances de production              |

`npm run format` est le seul de ces scripts qualité autorisé à réécrire des fichiers.
`npm run check`, `npm run audit` et `npm run audit:prod` sont strictement non modificatifs. Les
audits ne font pas partie de `check` : les avis connus décrits dans
[`docs/security-debt.md`](docs/security-debt.md) produisent actuellement un code de sortie non nul
sans correction stable compatible. Ils restent des contrôles obligatoires avant une fusion ou une
livraison.

## Structure

```text
src/
├── app/                    # App Router, pages et Route Handlers
├── modules/
│   ├── auth/               # Responsabilité différée documentée
│   ├── dashboard/          # Tableau de bord technique actuel
│   ├── catalog/            # Responsabilité différée documentée
│   ├── publications/       # Responsabilité différée documentée
│   └── audit/              # Responsabilité différée documentée
├── server/
│   ├── config/             # Configuration serveur validée
│   ├── security/           # Redaction des données sensibles
│   ├── errors/             # Erreurs typées et réponses HTTP sûres
│   └── observability/      # Corrélation et logs structurés
└── shared/
    ├── components/         # Composants d’interface réutilisables
    ├── config/             # Configuration publique
    ├── constants/
    ├── types/
    ├── utilities/
    └── validation/
tests/                      # Tests comportementaux Vitest
docs/architecture.md        # Décisions et frontières locales
```

Les modules sous `src/server` importent `server-only`. Une tentative d’import depuis un Client
Component doit donc échouer au build.

## Configuration d’environnement

Le fichier `.env.example` contient uniquement des métadonnées non sensibles :

| Variable               | Portée   | Obligatoire | Valeur de repli      |
| ---------------------- | -------- | ----------- | -------------------- |
| `NEXT_PUBLIC_APP_NAME` | Publique | Non         | `Promptube Admin`    |
| `APP_ENV`              | Serveur  | Non         | valeur de `NODE_ENV` |
| `APP_VERSION`          | Serveur  | Non         | version du package   |

Les valeurs fournies sont validées avec Zod. Une valeur présente mais invalide provoque un échec
explicite sans réafficher son contenu. Les fichiers `.env` réels restent ignorés ; seul
`.env.example` est versionné.

Aucune variable PostgreSQL, Redis, stockage ou paiement n’existe tant que ces services ne sont pas
utilisés.

## Healthcheck

`GET /api/health` retourne uniquement :

```json
{
  "environment": "development",
  "service": "promptube-admin-locale",
  "status": "ok",
  "timestamp": "2026-07-27T12:00:00.000Z",
  "version": "0.1.0"
}
```

Les paramètres de requête inattendus et les identifiants de corrélation invalides sont rejetés par
une réponse `400` sûre. Le endpoint ne retourne ni chemin, ni variable brute, ni stack trace, ni
version de dépendance.

## Sécurité et erreurs

Le socle applique actuellement :

- suppression de l’en-tête `X-Powered-By` ;
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` et
  désactivation du DNS prefetch ;
- réponses d’erreur publiques normalisées sans stack trace ;
- identifiants de corrélation validés ;
- logs JSON structurés avec redaction des champs sensibles ;
- Server Components par défaut et frontière `server-only`.

La CSP finale, HSTS au niveau du proxy HTTPS, l’authentification, les sessions, MFA, RBAC, CSRF,
rate limiting et l’audit métier sont différés. Ils nécessitent des contrats et une infrastructure
qui n’existent pas encore.

## Tests et build

Le jeu de tests couvre la configuration, les erreurs, la redaction des logs, les en-têtes, le
healthcheck et le rendu sémantique du tableau de bord. La couverture ne peut pas descendre sous 80 %
pour les statements, lignes et fonctions, ni sous 65 % pour les branches :

```bash
npm run test
npm run test:coverage
npm run build
```

Les rapports `coverage/`, `.next/`, `node_modules/` et les caches ne sont jamais versionnés.

## Règles Git

Ce dossier est un dépôt Git local indépendant :

- aucun remote ;
- `main` est la branche stable locale ;
- `develop` est la branche d’intégration locale ;
- le travail passe par `feature/*`, `fix/*`, `chore/*` ou `security/*` ;
- les fusions sont locales et aucun push n’est effectué ;
- le dépôt ne doit jamais inclure `promptube-prod` ni les documents du dossier parent.

Le code de cette fondation est développé sur `chore/admin-foundation`. Cette branche ne doit pas
être fusionnée automatiquement dans `develop`.

## Fonctionnalités absentes

Cette phase n’ajoute volontairement aucun :

- compte administrateur, authentification, MFA ou rôle ;
- utilisateur client ;
- catalogue, module ou publication ;
- commande, paiement ou droit d’accès ;
- client vers la production ;
- base de données, cache, stockage ou service Docker.

Consulter `docs/architecture.md` pour les décisions internes et `CHANGELOG.local.md` pour
l’historique local. Le suivi des avis de dépendances non résolus se trouve dans
`docs/security-debt.md`.
