# Promptube Admin locale

Application Next.js privée destinée à l’administration locale de Promptube. Cette version fournit la
fondation technique, son infrastructure Docker locale isolée, PostgreSQL, Redis, Drizzle ORM, Better
Auth, l’authentification administrateur locale, le TOTP obligatoire, les sessions révocables, le
journal d’audit et le catalogue local des catégories, sous-catégories, modules et versions de
modules. Il contient également la fondation serveur isolée du validateur Markdown sécurisé, sans
route ni interface consommatrice. Le catalogue reste strictement local : aucune publication, aucun
upload et aucune connexion à `promptube-prod` ne sont ajoutés.

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

| Script                              | Rôle                                                        |
| ----------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                       | Serveur de développement Next.js                            |
| `npm run build`                     | Build de production                                         |
| `npm run start`                     | Serveur du build, à lancer explicitement                    |
| `npm run lint`                      | Analyse ESLint du projet                                    |
| `npm run typecheck`                 | Vérification TypeScript sans émission                       |
| `npm run test`                      | Tests Vitest en exécution unique                            |
| `npm run test:scripts`              | Tests isolés des scripts de secrets et du wrapper Compose   |
| `npm run test:operations`           | Tests crypto, manifeste, rétention et protections ops       |
| `npm run test:integration`          | Environnement Compose auth isolé et parcours intégré        |
| `npm run test:e2e`                  | Parcours navigateur Playwright dans `promptube_admin_test`  |
| `npm run test:auth:security`        | Contrôles sécurité auth dans l’environnement isolé          |
| `npm run test:auth:all`             | Validation complète auth, E2E, readiness et nettoyage       |
| `npm run test:catalog`              | Alias de la validation complète du catalogue local          |
| `npm run test:catalog:integration`  | Migrations, droits SQL et parcours catalogue isolés         |
| `npm run test:catalog:e2e`          | Parcours navigateur catalogue dans `promptube_admin_test`   |
| `npm run test:catalog:security`     | Contrôles sécurité catalogue dans l’environnement isolé     |
| `npm run test:catalog:all`          | Validation complète catalogue, auth, readiness et nettoyage |
| `npm run test:watch`                | Tests Vitest en mode interactif                             |
| `npm run test:coverage`             | Tests avec rapport V8 dans `coverage/`                      |
| `npm run format`                    | Formatage Prettier des fichiers suivis par la configuration |
| `npm run format:check`              | Vérification du formatage sans modification                 |
| `npm run check`                     | Format (contrôle seul), lint, types, tests, scripts, build  |
| `npm run audit`                     | Audit npm complet, sans correction automatique              |
| `npm run audit:prod`                | Audit npm limité aux dépendances de production              |
| `npm run docker:secrets:init`       | Génération locale des secrets Docker ignorés                |
| `npm run docker:config`             | Validation de la configuration Compose                      |
| `npm run docker:build`              | Construction des images administratives                     |
| `npm run docker:up`                 | Démarrage avec attente des healthchecks                     |
| `npm run docker:ps`                 | État des services Compose                                   |
| `npm run docker:logs`               | Dernières lignes de logs, sans suivi persistant             |
| `npm run docker:health`             | Vérification des healthchecks de la stack active            |
| `npm run docker:verify`             | Contrôles d’intégration, de ports et d’isolation            |
| `npm run docker:up:storage`         | Démarrage explicite du stockage objet optionnel             |
| `npm run docker:verify:storage`     | Vérification lorsque le profil stockage est actif           |
| `npm run docker:test:config`        | Validation Compose de l’environnement de test auth          |
| `npm run docker:down`               | Arrêt sans suppression des volumes                          |
| `npm run db:check`                  | Revue statique des migrations SQL versionnées               |
| `npm run db:provision`              | Provisioning idempotent des rôles PostgreSQL locaux         |
| `npm run db:migrate`                | Application explicite des migrations Drizzle                |
| `npm run db:status`                 | Statut des migrations appliquées                            |
| `npm run db:backup`                 | Alias de la sauvegarde PostgreSQL chiffrée                  |
| `npm run db:restore:test`           | Alias de la restauration isolée chiffrée                    |
| `npm run admin:bootstrap`           | Création interactive locale du premier administrateur       |
| `npm run admin:sessions:revoke-all` | Révocation locale explicite de toutes les sessions admin    |
| `npm run ops:status`                | État opérationnel non sensible                              |
| `npm run backup:create`             | Sauvegarde PostgreSQL chiffrée et manifestée                |
| `npm run backup:list`               | Liste non sensible des sauvegardes                          |
| `npm run backup:verify`             | Vérification SHA-256, MAC, AES-GCM et `pg_restore -l`       |
| `npm run backup:restore:test`       | Restauration dans `promptube_admin_restore_test`            |
| `npm run backup:retention:dry-run`  | Simulation de rétention locale                              |
| `npm run backup:retention:apply`    | Application avec confirmation explicite                     |
| `npm run secrets:rotation:check`    | Inventaire non sensible des secrets                         |
| `npm run secrets:rotation:test`     | Rotation isolée PostgreSQL/Redis/clé backup                 |
| `npm run disaster-recovery:test`    | Reprise après incident sur données factices                 |

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
│   ├── auth/               # Interface et composants d’authentification admin
│   ├── dashboard/          # Tableau de bord technique actuel
│   ├── catalog/            # Interface catalogue local et composants associés
│   ├── publications/       # Responsabilité différée documentée
│   └── audit/              # Consultation locale du journal d’audit
├── server/
│   ├── auth/               # Better Auth, mots de passe, sessions et DAL
│   ├── catalog/            # Domaine, validations, politiques et services catalogue
│   ├── config/             # Configuration serveur validée
│   ├── database/           # Drizzle ORM, schéma et client PostgreSQL
│   ├── redis/              # Client Redis et rate limiting
│   ├── markdown/           # Validation Markdown isolée, fermée et sans réseau
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

### Validateur Markdown sécurisé

`src/server/markdown` expose uniquement `validateSecureMarkdown`. L’API reçoit des octets, un chemin
logique, un inventaire de fichiers et un identifiant de corrélation. Elle exécute la validation dans
un worker Node.js limité et retourne soit un rapport avec un DTO fermé profondément immuable, soit
un rapport invalide avec `document: null`.

Le pipeline verrouillé combine CommonMark/GFM, validation MDAST, politique URL unique, projection
HAST contrôlée et sanitisation construite depuis zéro. Les listes de tâches deviennent du texte
inerte, les langages de code ne créent aucune classe et les alignements de tableaux sont ignorés.
Toute accolade non échappée hors code est refusée. Aucun accès réseau, rendu React, upload, stockage
ou route applicative n’est activé.

Le worker est inclus explicitement dans le traçage du build standalone. Les limites de temps,
mémoire et concurrence restent provisoires. Le contrat demeure `DRAFT` tant que les modules réels,
la parité serveur/client et les autres critères d’approbation ne sont pas validés.

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

PostgreSQL, Redis et Better Auth utilisent des identifiants non sensibles dans `.env.docker`, créé
localement depuis `.env.docker.example`. Les mots de passe et secrets restent exclusivement dans les
fichiers ignorés de `secrets/` et sont lus via des chemins `*_FILE`.

## Infrastructure Docker locale

Le projet Compose `promptube_admin` fournit quatre services par défaut et un stockage objet
optionnel :

```text
127.0.0.1:8080 → admin-promptube-reverse-proxy → admin-promptube-app

promptube_admin_backend (interne)
├─ admin-promptube-app
├─ admin-promptube-postgres
├─ admin-promptube-redis
└─ admin-promptube-object-storage  # profil storage uniquement
```

Le port `8080` a été retenu après inventaire et reste configurable dans `.env.docker`. Seul le
reverse proxy le publie, exclusivement sur `127.0.0.1`. Aucun port PostgreSQL, Redis, application,
API S3 ou console de stockage n’est publié.

L’application est connectée au backend pour PostgreSQL et Redis, mais son liveness reste indépendant
et elle peut démarrer avec le proxy seul pour prouver l’absence de dépendance artificielle au
démarrage. Le réseau frontend n’est pas marqué interne ; une application qui y est connectée peut
donc conserver une connectivité sortante. Aucune information de connexion à `promptube-prod` ne lui
est fournie.

Première initialisation :

```bash
cp .env.docker.example .env.docker
chmod 600 .env.docker
npm run docker:secrets:init
npm run docker:config
npm run docker:build
npm run docker:up
npm run docker:verify
npm run ops:status
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

`GET /api/health` et `GET /api/health/live` retournent uniquement :

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

## Validation d’authentification isolée

`npm run test:auth:all` crée un environnement Compose séparé nommé `promptube_admin_test`. Il
utilise PostgreSQL et Redis en `tmpfs`, des secrets générés dans un dossier temporaire ignoré, une
image Playwright officielle `mcr.microsoft.com/playwright:v1.62.0-noble` verrouillée par le digest
OCI `sha256:baed2032d533817f3dbe6425de795788430ba345e819a1201337009ba17c9d07`, et aucun port hôte.

Le test provisionne une base vide, applique les migrations versionnées, crée un administrateur
temporaire par le même code que `admin:bootstrap`, vérifie login, TOTP, code de secours, logout,
révocation, expirations, rate limiting Redis, audit, cookies, refus CSRF/origine et pannes
PostgreSQL/Redis. Les rapports, traces, vidéos et captures Playwright sont désactivés. Playwright et
Chromium ne sont jamais copiés dans l’image runtime Next.js.

Le nettoyage final arrête et supprime uniquement les conteneurs et réseaux `promptube_admin_test`.
Il ne crée aucun volume nommé de test, ne partage pas les volumes `promptube_admin_*`, ne monte
aucun secret réel et ne touche pas à `promptube-prod`.

`GET /api/health/ready` vérifie PostgreSQL et Redis avec des timeouts courts. En cas de panne, il
renvoie `503` avec un état générique, sans hôte, port, utilisateur, URL ou stack trace.

## Catalogue local

Le catalogue admin local est accessible après session valide, rôle admin actif et TOTP complété. Il
ajoute les routes protégées `/catalog`, `/catalog/categories`, `/catalog/subcategories` et
`/catalog/modules`.

Le modèle couvre les catégories, sous-catégories, modules et versions de modules. Les versions
suivent le workflow `DRAFT → IN_REVIEW → APPROVED → SUPERSEDED`, avec retour autorisé
`IN_REVIEW → DRAFT`. Le libellé `APPROVED` signifie uniquement « approuvé localement » et ne publie
rien vers la production. Les versions approuvées ou remplacées sont immuables ; l’approbation d’une
nouvelle version remplace l’ancienne dans la même transaction.

La suppression physique n’est pas exposée. L’archivage est réversible lorsque les contraintes parent
le permettent. Les mises à jour utilisent un verrouillage optimiste par `revision` et retournent un
conflit si une modification concurrente est détectée.

Le Markdown est stocké en texte, borné et non rendu en HTML dans cette phase. Aucun upload, image,
ZIP, stockage objet métier ou moteur de recherche externe n’est utilisé.

```bash
npm run test:catalog:all
```

Cette commande réutilise `promptube_admin_test`, génère des secrets temporaires, applique toutes les
migrations, crée un admin temporaire, active son TOTP, valide le workflow catalogue complet, vérifie
les droits PostgreSQL, l’audit, les conflits, la recherche, les filtres, la pagination, puis nettoie
les conteneurs/réseaux de test.

## Authentification locale

L’inscription publique est désactivée. Le premier administrateur se crée uniquement depuis un
service Docker one-shot local, après une sauvegarde pré-admin chiffrée et restaurée :

```bash
npm run docker:secrets:init
npm run docker:up
npm run db:provision
npm run db:migrate
npm run backup:create
npm run backup:verify
npm run backup:restore:test
npm run admin:bootstrap
```

La commande demande email, nom et mot de passe de manière interactive. Le mot de passe n’est pas
passé en argument, variable Compose ou fichier. La politique accepte les phrases de passe de 14 à
128 caractères. Le hachage utilise Argon2id via `@node-rs/argon2` avec 64 MiB, 3 itérations et
parallélisme 1.

Après la première connexion par mot de passe, le TOTP est obligatoire. Un administrateur sans TOTP
est redirigé vers `/setup-2fa` et ne peut pas accéder au dashboard ni à `/audit` tant que le second
facteur n’est pas validé. Les trusted devices restent désactivés.

## Sécurité et erreurs

Le socle applique actuellement :

- suppression de l’en-tête `X-Powered-By` ;
- sessions serveur persistantes et révocables dans PostgreSQL ;
- limitation des tentatives via Redis ;
- cookies HttpOnly et SameSite Strict, avec exception `Secure=false` limitée à `APP_ENV=local` ;
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` et
  désactivation du DNS prefetch ;
- réponses d’erreur publiques normalisées sans stack trace ;
- identifiants de corrélation validés ;
- logs JSON structurés avec redaction des champs sensibles ;
- Server Components par défaut et frontière `server-only`.

La CSP finale, HSTS au niveau du proxy HTTPS, RBAC avancé, authentification sociale, reset email,
MFA avancée et audit métier complet restent différés. Ils nécessitent des contrats et une
infrastructure qui n’existent pas encore.

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

Ce dossier est un dépôt Git indépendant de `promptube-prod` :

- un remote Git peut exister uniquement après décision explicite du propriétaire ;
- `main` est la branche stable locale ;
- `develop` est la branche d’intégration locale ;
- le travail passe par `feature/*`, `fix/*`, `chore/*` ou `security/*` ;
- les fusions sont locales avant publication ;
- aucun push n’est effectué sans demande explicite du propriétaire et sans contrôles locaux réussis
  ;
- le dépôt ne doit jamais inclure `promptube-prod` ni les documents du dossier parent.

Les branches de travail ne sont fusionnées dans `develop` qu’après validation complète, par merge
local explicite. `main` n’est jamais utilisée pour le développement direct.

## Documentation produit

Les documents sous `docs/products/` définissent les produits Promptube et les contrats techniques
applicables à leurs futurs paquets distribuables.

- [Contrat documentaire des produits Promptube](docs/products/README.md)
- [Bundle initial — Développement logiciel](docs/products/developpement-logiciel/README.md)
- [Contrat technique des paquets de modules](docs/products/contrat-paquet-module.md)
- [Contrat versionné du manifeste](docs/products/contrat-manifeste-module.md)
- [Schéma JSON initial du manifeste](docs/products/schemas/promptube-module.schema.json)
- [Contrat de sécurisation du Markdown](docs/products/contrat-markdown-securise.md)

Les fiches produit décrivent les modules attendus. Les contrats et le schéma définissent la
structure technique que devront respecter leurs futurs dossiers et archives privées.

Les sept fondations de sécurisation du Markdown et l’architecture du validateur sont validées comme
base de conception. Le contrat reste au statut `DRAFT` jusqu’à la validation des limites sur le
matériel cible, des modules distribuables réels et de la future parité de rendu serveur/client.

Ces éléments n’intègrent aucun module distribuable et n’activent aucun upload, stockage, ZIP,
paiement ou mécanisme de publication dans l’application.

## Fonctionnalités absentes

Cette phase n’ajoute volontairement aucun :

- utilisateur client ;
- publication vers la production ;
- upload, image, ZIP ou stockage objet métier ;
- commande, paiement ou droit d’accès ;
- client vers la production ;
- stockage objet applicatif ou usage MinIO par défaut ;
- connexion applicative à la production.

Consulter `docs/architecture.md` pour les décisions internes, `docs/authentication.md` pour
l’identité locale, `docs/database.md` pour PostgreSQL/Drizzle, `docs/catalog.md` et
`docs/catalog-workflow.md` pour le catalogue, `docs/backups.md` pour les backups,
`docs/disaster-recovery.md` pour la reprise, `docs/secret-rotation.md` pour les rotations et
`CHANGELOG.local.md` pour l’historique local. Les opérations Docker sont décrites dans
`docs/docker-local.md`. Le suivi des avis de dépendances non résolus se trouve dans
`docs/security-debt.md`.
