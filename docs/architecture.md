# Architecture de la fondation admin

## Portée

Cette architecture couvre le socle local Next.js, ses services d’infrastructure isolés, PostgreSQL,
Redis, les migrations Drizzle, l’authentification administrateur locale, le TOTP obligatoire, les
sessions révocables, l’audit persistant et les opérations locales de sauvegarde/restauration. Elle
n’autorise aucune connexion à la production, donnée métier, système de paiement ou fonctionnalité
commerciale. Le stockage objet reste hors profil par défaut et n’est pas utilisé par le code
applicatif.

## Frontières internes

```text
src/app ───────────────▶ src/modules ─────▶ src/shared
  │                           │
  ├───────────────────────────┘
  └── Route Handlers et
      Server Components ─────▶ src/server ─────▶ src/shared
```

- `app` assemble les routes Next.js ;
- `modules` porte les capacités fonctionnelles isolées ;
- `shared` contient uniquement les contrats et composants réutilisables ;
- `server` porte la configuration privée, les erreurs HTTP, la sécurité et l’observabilité.

Chaque module de `src/server` importe `server-only`. Les schémas partagés ne doivent jamais importer
la couche serveur. Les Client Components ne peuvent importer que des éléments compatibles avec le
navigateur depuis `modules` ou `shared`.

## Frontières Docker

```text
127.0.0.1:8080
       │
       ▼
admin-promptube-reverse-proxy ── frontend ── admin-promptube-app

backend interne isolé
├── admin-promptube-app
├── admin-promptube-postgres
├── admin-promptube-redis
└── admin-promptube-object-storage  # profil storage uniquement
```

- `promptube_admin_frontend` relie uniquement le proxy et l’application ;
- `promptube_admin_backend` est interne et relie l’application aux services PostgreSQL et Redis ;
- le stockage objet reste sous profil `storage` explicite ;
- seul le proxy publie `127.0.0.1:8080` ;
- les trois volumes sont propres au projet Compose `promptube_admin` ;
- les secrets sont des fichiers locaux ignorés, montés en lecture seule ;
- aucun réseau, volume, secret ou service de `promptube-prod` n’est référencé.

Le liveness applicatif reste indépendant de PostgreSQL et Redis, ce qui permet de démarrer app et
proxy seuls pour vérifier l’absence de dépendance artificielle au boot. `internal: true` isole le
backend, mais ne coupe pas à lui seul tout accès Internet de l’application : le réseau frontend
auquel elle reste connectée n’est pas interne. Aucune variable de connexion à `promptube-prod` n’est
ajoutée.

## Configuration

La configuration est séparée en deux entrées :

- `src/server/config/environment.ts` valide les métadonnées serveur ;
- `src/shared/config/public-environment.ts` expose uniquement les variables préfixées
  `NEXT_PUBLIC_`.

Zod valide les valeurs à l’import de la couche concernée. Les messages d’échec indiquent le champ
invalide, jamais sa valeur.

Les variables non sensibles de PostgreSQL, Redis, Better Auth et des origines locales sont validées
par Zod. Les mots de passe et secrets sont toujours lus par chemin de fichier secret ; aucune URL
contenant un mot de passe n’est construite ou journalisée.

PostgreSQL est la source de vérité locale des administrateurs, sessions, états TOTP, codes de
secours gérés par Better Auth, audit et migrations. Redis reste jetable et limité aux compteurs
temporaires. Les sauvegardes PostgreSQL chiffrées sont stockées sous `.local/` par défaut avec
manifeste non sensible ; ce dossier est ignoré par Git et Docker.

Dans Docker, `NODE_ENV=production` active le runtime Next.js optimisé et `APP_ENV=local` décrit le
déploiement local. Ces deux notions sont volontairement distinctes et testées. Hors Docker,
`npm run dev` conserve `development`.

## Requête healthcheck

```text
GET /api/health/live
  → création ou validation de la corrélation
  → rejet de tout paramètre inattendu
  → lecture de métadonnées validées
  → log structuré sans secret
  → réponse JSON non sensible et no-store
```

Les erreurs attendues deviennent des `AppError` typées. Toute erreur inattendue est convertie en
`INTERNAL_ERROR` avec un message public générique. Aucune stack trace n’est sérialisée.

`GET /api/health` est l’alias compatible du liveness. `GET /api/health/ready` vérifie PostgreSQL et
Redis avec des timeouts courts et retourne `503` si l’une des dépendances est indisponible, sans
publier d’hôte, port, utilisateur, URL ou stack trace.

## Journalisation

Le logger natif produit une ligne JSON par événement avec :

- `level` ;
- `message` ;
- `timestamp` ISO 8601 ;
- `correlationId` si disponible ;
- `context` nettoyé ;
- erreur normalisée.

Les clés correspondant aux mots de passe, jetons, cookies, secrets, autorisations, sessions,
identifiants ou clés privées/API sont remplacées par `[REDACTED]`. Les erreurs inattendues ne
publient pas leur message ni leur stack. Les appelants doivent néanmoins fournir des messages
constants et ne jamais interpoler de donnée sensible.

## Sécurité active

- `poweredByHeader: false` ;
- protection contre le MIME sniffing ;
- interdiction d’intégration en frame ;
- politique de référent stricte ;
- désactivation des capacités navigateur inutiles ;
- DNS prefetch désactivé ;
- frontière serveur vérifiée par Next.js ;
- validation du healthcheck ;
- Better Auth avec inscription publique désactivée ;
- hachage Argon2id des mots de passe administrateur ;
- TOTP obligatoire sans trusted device ;
- sessions serveur persistantes et révocables ;
- rate limiting Redis ;
- rôles PostgreSQL séparés pour bootstrap, migrations et runtime ;
- audit persistant sans secret ;
- réponses d’erreur et logs sans détails sensibles.

## Protections différées

- CSP : à définir avec l’interface et ses ressources finales ;
- HSTS : à appliquer seulement derrière le proxy HTTPS validé ;
- RBAC avancé et permissions fines ;
- reset email, OAuth, magic link et fournisseurs sociaux ;
- CORS privé et canal admin vers production ;
- télémétrie et agrégation de logs externes.
- sauvegarde automatisée et test périodique de restauration des trois volumes.
- remplacement de MinIO par un stockage S3 activement maintenu avant toute production.

Ces protections ne doivent pas être simulées avant que leurs contrats et leur infrastructure soient
approuvés.

## Tests

Vitest s’exécute avec jsdom. Les alias TypeScript sont résolus nativement par Vite. Un alias de test
neutralise uniquement le marqueur `server-only` afin de tester les fonctions serveur sans rendre ce
code importable par l’application cliente.

La couverture V8 est générée dans `coverage/` et n’est jamais versionnée. Les seuils minimaux sont
80 % pour les statements, lignes et fonctions, et 65 % pour les branches.

Les tests d’intégration d’authentification utilisent un projet Compose séparé,
`promptube_admin_test`, défini dans `compose.test.yaml`. Il ne partage ni réseau, ni volume, ni
secret avec `promptube_admin`, `promptube-prod` ou les ressources `infrastructure_*`. PostgreSQL et
Redis y utilisent `tmpfs`; MinIO est absent. Le runner Playwright est l’image officielle
`mcr.microsoft.com/playwright:v1.62.0-noble` verrouillée par digest et accède au proxy uniquement
par DNS interne Compose, sans port hôte.

`APP_ENV=test` active uniquement des durées courtes pour les tests de rate limiting et l’exception
HTTP nécessaire aux cookies non `Secure` dans le réseau Compose de test. `APP_ENV=local` conserve
les limites locales normales et `NODE_ENV=production` reste réservé au runtime Next.js optimisé.
