# Promptube Admin locale

Application Next.js privée destinée à l’administration locale de Promptube. Cette version fournit la
fondation technique et son infrastructure Docker locale isolée : structure applicative, contrôles
qualité, healthcheck, gestion sûre des erreurs, interface neutre, proxy, PostgreSQL, Redis et
stockage objet. Elle ne manipule encore aucune donnée métier.

## Prérequis

- Node.js `24.18.0` ;
- npm `11.16.0` ;
- Docker Engine et Docker Compose pour l’infrastructure locale ;
- aucun service Docker n’est requis pour les contrôles applicatifs exécutés directement sur l’hôte.

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

| Script                        | Rôle                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| `npm run dev`                 | Serveur de développement Next.js                            |
| `npm run build`               | Build de production                                         |
| `npm run start`               | Serveur du build, à lancer explicitement                    |
| `npm run lint`                | Analyse ESLint du projet                                    |
| `npm run typecheck`           | Vérification TypeScript sans émission                       |
| `npm run test`                | Tests Vitest en exécution unique                            |
| `npm run test:scripts`        | Tests isolés des scripts de secrets et du wrapper Compose   |
| `npm run test:watch`          | Tests Vitest en mode interactif                             |
| `npm run test:coverage`       | Tests avec rapport V8 dans `coverage/`                      |
| `npm run format`              | Formatage Prettier des fichiers suivis par la configuration |
| `npm run format:check`        | Vérification du formatage sans modification                 |
| `npm run check`               | Format (contrôle seul), lint, types, tests, scripts, build  |
| `npm run audit`               | Audit npm complet, sans correction automatique              |
| `npm run audit:prod`          | Audit npm limité aux dépendances de production              |
| `npm run docker:secrets:init` | Génération locale des secrets Docker ignorés                |
| `npm run docker:config`       | Validation de la configuration Compose                      |
| `npm run docker:build`        | Construction des images administratives                     |
| `npm run docker:up`           | Démarrage avec attente des healthchecks                     |
| `npm run docker:ps`           | État des services Compose                                   |
| `npm run docker:logs`         | Dernières lignes de logs, sans suivi persistant             |
| `npm run docker:health`       | Vérification des cinq healthchecks                          |
| `npm run docker:verify`       | Contrôles d’intégration, de ports et d’isolation            |
| `npm run docker:down`         | Arrêt sans suppression des volumes                          |

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
tests/                      # Tests Vitest et tests shell isolés
docs/architecture.md        # Décisions et frontières locales
docs/docker-local.md        # Exploitation de la stack Docker locale
docker/                     # Images locales, proxy et entrypoints sécurisés
scripts/                    # Commandes Compose, secrets et contrôles d’intégration
secrets/                    # Instructions et exemples, secrets réels ignorés
compose.yaml                # Stack locale isolée promptube_admin
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

`APP_ENV` accepte explicitement `development`, `local`, `test` ou `production`. Dans le conteneur,
`NODE_ENV=production` sélectionne le runtime Next.js optimisé tandis que `APP_ENV=local` décrit
l’environnement réel. Le serveur `npm run dev` utilise `development` par défaut.

Aucune variable PostgreSQL, Redis, stockage ou paiement n’existe tant que ces services ne sont pas
utilisés par l’application. Les identifiants non sensibles de l’infrastructure sont placés dans
`.env.docker`, créé localement depuis `.env.docker.example`. Les mots de passe restent exclusivement
dans les fichiers ignorés de `secrets/`.

## Infrastructure Docker locale

Le projet Compose `promptube_admin` fournit cinq services :

```text
127.0.0.1:8080 → admin-promptube-reverse-proxy → admin-promptube-app

promptube_admin_backend (interne, sans application connectée)
├─ admin-promptube-postgres
├─ admin-promptube-redis
└─ admin-promptube-object-storage
```

Le port `8080` a été retenu après inventaire et reste configurable dans `.env.docker`. Seul le
reverse proxy le publie, exclusivement sur `127.0.0.1`. Aucun port PostgreSQL, Redis, application,
API S3 ou console de stockage n’est publié.

L’application ne dépend encore d’aucun service de données : elle est volontairement absente du
réseau backend et peut démarrer avec le proxy seul. Le réseau frontend n’est pas marqué interne ;
une application qui y est connectée peut donc conserver une connectivité sortante. Aucune
information de connexion vers les trois services ou vers `promptube-prod` ne lui est fournie.

Première initialisation :

```bash
cp .env.docker.example .env.docker
chmod 600 .env.docker
npm run docker:secrets:init
npm run docker:config
npm run docker:build
npm run docker:up
npm run docker:verify
```

La génération de secrets utilise des fichiers temporaires créés dans `secrets/`, un `umask 077`,
`openssl rand -hex 32` et un renommage atomique. Elle refuse les liens symboliques, répertoires,
fichiers spéciaux, fichiers vides et chemins résolus hors du dossier. Un secret existant n’est
jamais remplacé.

Arrêt conservant les données :

```bash
npm run docker:down
```

Ne jamais ajouter `-v` et ne jamais utiliser une commande `prune`. Consulter
[`docs/docker-local.md`](docs/docker-local.md) avant toute opération.

## Healthcheck

`GET /api/health` retourne uniquement :

```json
{
  "environment": "local",
  "service": "promptube-admin-locale",
  "status": "ok",
  "timestamp": "<horodatage ISO 8601 courant>",
  "version": "0.1.0"
}
```

La valeur Docker est `local`; un serveur lancé par `npm run dev` retourne `development`.

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

Les branches de travail ne sont fusionnées dans `develop` qu’après validation complète, par merge
local explicite. `main` n’est jamais utilisée pour le développement direct.

## Fonctionnalités absentes

Cette phase n’ajoute volontairement aucun :

- compte administrateur, authentification, MFA ou rôle ;
- utilisateur client ;
- catalogue, module ou publication ;
- commande, paiement ou droit d’accès ;
- client vers la production ;
- schéma, migration ou donnée métier ;
- connexion applicative à PostgreSQL, Redis, stockage ou production.

Consulter `docs/architecture.md` pour les décisions internes et `CHANGELOG.local.md` pour
l’historique local. Les opérations Docker sont décrites dans `docs/docker-local.md`. Le suivi des
avis de dépendances non résolus se trouve dans `docs/security-debt.md`.
