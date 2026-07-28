# Infrastructure Docker locale de l’administration

## Portée

Cette stack sert exclusivement au développement et à la validation locale de l’administration
Promptube. Elle contient l’infrastructure PostgreSQL/Redis, les services one-shot de provisioning,
migration et bootstrap, l’authentification locale et le catalogue local. Elle ne contient aucune
publication production, aucun upload métier et ne se connecte jamais à `promptube-prod`.

Le nom Compose est fixé à `promptube_admin`. Les noms de services sont préfixés `admin-promptube-*`,
sans `container_name`, afin que Compose conserve l’isolation et la gestion de leur cycle de vie.

## Versions verrouillées

| Composant      | Référence                                                     |
| -------------- | ------------------------------------------------------------- |
| Application    | `admin-promptube-app:0.1.0`                                   |
| Node.js        | `node:24.18.0-alpine3.23`                                     |
| Reverse proxy  | `admin-promptube-reverse-proxy:1.31.3`                        |
| Nginx de base  | `nginxinc/nginx-unprivileged:1.31.3-alpine3.24`               |
| PostgreSQL     | `postgres:18.4-alpine3.23`                                    |
| Redis          | `redis:8.6.5-alpine3.23`                                      |
| Stockage objet | `admin-promptube-object-storage:RELEASE.2025-10-15T17-29-55Z` |
| Source MinIO   | tag `RELEASE.2025-10-15T17-29-55Z`                            |
| Commit MinIO   | `9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a`                    |

Les images de base sont également verrouillées par digest dans les Dockerfiles et `compose.yaml`.
Les digests doivent être revérifiés explicitement lors d’une mise à jour de version.

L’image OCI officielle exacte `quay.io/minio/minio:RELEASE.2025-10-15T17-29-55Z` n’étant plus
accessible, l’image locale est construite depuis le dépôt GitHub officiel. Le tag résout vers le
commit complet ci-dessus. L’archive officielle de ce commit est acceptée uniquement si son SHA-256
vaut `45521908307306e925c98d629e1c17d78c8b72b6ee242b1bfb1409f7d8ee5841`. Le builder Go et l’image
Alpine finale sont eux-mêmes verrouillés par digest ; la seconde étape ne conserve ni source, ni
compilateur, ni dépôt Git.

La source MinIO ciblait Go 1.24.8. Elle est compilée avec Go 1.25.12, version stable compatible et
verrouillée, afin d’intégrer les correctifs de sécurité de la bibliothèque standard sans modifier le
code source MinIO ni surcharger ses modules transitifs.

Le dépôt MinIO a été archivé et son code est publié comme source uniquement. Cette construction
répond au besoin local isolé, mais ne constitue ni une approbation de MinIO pour la production ni
une stratégie de maintenance future. Un stockage S3 activement maintenu doit être sélectionné,
analysé et migré avant toute production.

## Architecture

```text
Navigateur local
      │
      │ 127.0.0.1:8080
      ▼
admin-promptube-reverse-proxy
      │
      │ promptube_admin_frontend
      ▼
admin-promptube-app

promptube_admin_backend (internal)
├─ admin-promptube-app
├─ admin-promptube-postgres
├─ admin-promptube-redis
└─ admin-promptube-object-storage  # profil storage uniquement
```

Seul le reverse proxy publie un port. L’application et les ports internes `5432`, `6379`, `9000` et
`9001` ne possèdent aucun binding hôte. L’application rejoint le backend pour PostgreSQL et Redis,
mais conserve un liveness indépendant et peut démarrer avec le proxy seul. MinIO ne démarre plus par
défaut et nécessite le profil explicite `storage`.

Le backend est `internal`, mais cela ne signifie pas que toute connectivité sortante de
l’application est coupée : son réseau frontend reste un bridge non interne. Il n’existe cependant
aucun réseau, identifiant ou connexion vers `promptube-prod`.

## Port local

`8080` a été revérifié le 28 juillet 2026 après inventaire des ports hôte et reste libre. La valeur
peut être adaptée dans `.env.docker` après un nouvel inventaire avec `ss -ltnup`. Elle doit toujours
rester liée à `127.0.0.1`.

## Réseaux et volumes

Compose crée uniquement :

- `promptube_admin_frontend` ;
- `promptube_admin_backend`, marqué `internal` ;
- `promptube_admin_postgres-data` ;
- `promptube_admin_redis-data` ;
- `promptube_admin_object-storage-data`.

Les volumes ne sont ni externes ni partagés. Les volumes `infrastructure_*`, ceux de
`promptube-prod` et toute autre ressource étrangère sont intouchables.

## Configuration et secrets

Créer le fichier local non secret :

```bash
cp .env.docker.example .env.docker
chmod 600 .env.docker
```

Puis générer les secrets :

```bash
npm run docker:secrets:init
```

La commande crée, sans afficher leur contenu :

- `secrets/postgres-password` ;
- `secrets/redis-password` ;
- `secrets/object-storage-password` ;
- `secrets/postgres-app-password` ;
- `secrets/postgres-migration-password` ;
- `secrets/postgres-backup-password` ;
- `secrets/better-auth-secret`.
- `secrets/backup-encryption-key`.

Chaque fichier réel est ignoré par Git et protégé en mode `600`. Les fichiers `*.example` ne
contiennent que des marqueurs factices et ne sont jamais utilisés par Compose.

`postgres-backup-password` alimente un rôle PostgreSQL lecture seule réservé à `pg_dump`.
`backup-encryption-key` n’est montée dans aucun conteneur runtime ; elle chiffre les backups locaux
et doit rester séparée des archives chiffrées.

La génération est atomique : `umask 077`, temporaire créé dans le même dossier, 32 octets OpenSSL
encodés en hexadécimal, validation, mode `600`, puis renommage. Un fichier existant n’est jamais
remplacé. Les liens symboliques, répertoires, FIFO, fichiers spéciaux, chemins extérieurs, fichiers
vides et modes différents de `600` sont refusés avant le démarrage.

PostgreSQL et MinIO utilisent respectivement `POSTGRES_PASSWORD_FILE` et `MINIO_ROOT_PASSWORD_FILE`.
L’application lit uniquement les secrets runtime nécessaires : mot de passe PostgreSQL applicatif,
mot de passe Redis et secret Better Auth. Le compte PostgreSQL bootstrap n’est pas monté dans
Next.js. Redis lit son secret au démarrage et écrit une configuration en mode `600` dans un `tmpfs`,
afin que le mot de passe ne figure ni dans Compose ni dans la ligne de commande du processus.

Les attributs `uid`, `gid` et `mode` de Compose ne garantissent pas les permissions effectives d’un
secret monté depuis un fichier hôte. Le contrôle d’intégration vérifie donc le type, le mode `600`
et le montage en lecture seule dans les conteneurs.

## Commandes

Validation et construction :

```bash
npm run docker:config
npm run docker:build
npm run docker:test:config
```

Démarrage avec attente des healthchecks :

```bash
npm run docker:up
npm run docker:health
npm run docker:verify
```

Le stockage objet ne démarre que sur demande :

```bash
npm run docker:up:storage
npm run docker:verify:storage
```

Le catalogue local n’utilise pas MinIO. Les migrations et tests catalogue démarrent uniquement
PostgreSQL, Redis, l’application, le proxy et les services outils nécessaires.

Test minimal sans services de données :

```bash
./scripts/docker-compose.sh up -d --wait --wait-timeout 180 \
  admin-promptube-app admin-promptube-reverse-proxy
```

PostgreSQL, Redis et le stockage objet ne sont alors ni créés ni requis. Après vérification de
`/login` et `/api/health/live`, `npm run docker:down` arrête cette stack partielle sans volume.

Provisioning, migration et premier administrateur :

```bash
npm run db:provision
npm run db:migrate
npm run db:status
npm run db:backup
npm run db:restore:test
npm run admin:bootstrap
```

`db:migrate` est explicite et n’est jamais lancé par le démarrage normal de Next.js.
`admin:bootstrap` est interactif, local, et refuse de créer un second premier administrateur.
L’image `admin-promptube-tools:0.1.0` exécute ces commandes one-shot sous l’utilisateur non-root
`node`.

Validation isolée de l’identité admin :

```bash
npm run test:auth:all
```

Cette commande utilise le projet Compose distinct `promptube_admin_test`. Elle génère des secrets de
test temporaires, démarre PostgreSQL et Redis en `tmpfs`, provisionne les rôles, applique les
migrations, crée un administrateur temporaire par le code de bootstrap réel, exécute Playwright dans
l’image officielle `mcr.microsoft.com/playwright:v1.62.0-noble` verrouillée par le digest OCI
`sha256:baed2032d533817f3dbe6425de795788430ba345e819a1201337009ba17c9d07`, teste le parcours
authentification/TOTP/audit, vérifie les pannes readiness PostgreSQL et Redis, puis supprime
uniquement les conteneurs et réseaux `promptube_admin_test`.

L’environnement de test ne publie aucun port hôte, ne crée aucun volume nommé, ne monte aucun secret
réel, ne démarre pas MinIO, ne partage aucun réseau ou volume `promptube_admin_*` et ne touche pas à
`promptube-prod`. Le runner Playwright fonctionne dans le réseau Compose de test. Il n’est pas
présent dans l’image runtime Next.js.

Validation isolée du catalogue :

```bash
npm run test:catalog:all
```

Cette commande réutilise `promptube_admin_test`, applique toutes les migrations, crée un
administrateur temporaire, active son TOTP, vérifie les droits PostgreSQL, le workflow catalogue,
l’audit, les conflits de révision, la recherche, les filtres, la pagination et le nettoyage. MinIO
reste absent.

Inspection non persistante :

```bash
npm run docker:ps
npm run docker:logs
```

Reconstruction de l’application sans toucher aux volumes :

```bash
./scripts/docker-compose.sh build --no-cache admin-promptube-app
./scripts/docker-compose.sh up -d --wait --wait-timeout 180 admin-promptube-app
npm run docker:verify
```

Arrêt :

```bash
npm run docker:down
```

`docker:down` n’ajoute jamais `-v`. Il est interdit d’utiliser `docker compose down -v`, une
commande `prune`, ou de supprimer manuellement un volume, réseau ou conteneur étranger. Le wrapper
rend `ps`, `logs`, `stop` et `down` utilisables même si `.env.docker` ou un secret est
temporairement absent ; des valeurs publiques de substitution servent uniquement à rendre le fichier
Compose analysable. `down` fonctionne aussi quand la stack est déjà arrêtée.

## Healthchecks

- proxy : `GET /nginx-health` ;
- application : `GET /api/health/live` ;
- PostgreSQL : `pg_isready` avec les identifiants non sensibles ;
- Redis : `redis-cli ping` authentifié par le secret monté ;
- MinIO : `GET /minio/health/live` uniquement si le profil `storage` est actif.

`npm run docker:verify` contrôle aussi les réponses HTTP via le proxy, le liveness, le readiness
PostgreSQL/Redis, le contrat JSON `environment=local`, les en-têtes, les bindings de ports, les
labels Compose, les réseaux, les volumes, les capabilities effectives, `no-new-privileges`, les
racines en lecture seule, les `tmpfs`, le montage des secrets, l’absence de secret dans les logs et
`docker inspect`, l’absence de fichier `.env` ou d’outillage de test dans l’image finale et
l’absence de Google Fonts.

## Durcissement

- application exécutée avec l’utilisateur `node` non-root ;
- Nginx exécuté sur le port interne non privilégié `8080` avec son utilisateur non-root ;
- MinIO exécuté explicitement en `1000:1000` ;
- processus persistants PostgreSQL et Redis exécutés par leurs utilisateurs dédiés après
  initialisation du volume ;
- systèmes de fichiers racine en lecture seule ;
- répertoires temporaires en `tmpfs` avec `noexec` et `nosuid` ;
- `no-new-privileges` ;
- capacités supprimées, avec seulement `CHOWN`, `SETUID`, `SETGID`, `DAC_OVERRIDE` et `FOWNER`
  réintroduites là où les images officielles initialisent leurs volumes ;
- aucun mode privilégié, socket Docker, réseau hôte ou secret intégré dans une image.

L’exception aux utilisateurs non-root permanents concerne le court bootstrap des images officielles
PostgreSQL et Redis : leur point d’entrée doit préparer la propriété des volumes avant de remplacer
le processus par l’utilisateur de service.

## Reverse proxy

Nginx écoute sur `8080` dans son conteneur, masque sa version et transmet `Host`, `X-Forwarded-For`,
`X-Forwarded-Proto`, `X-Request-ID` et `X-Correlation-ID`. Les identifiants éventuellement fournis
par un client ne sont pas considérés fiables : Nginx les remplace par son propre `$request_id`. Les
logs excluent les query strings et les en-têtes sensibles. Les délais sont bornés et les en-têtes de
sécurité applicatifs ne sont pas dupliqués.

`client_max_body_size 10m` est une limite technique défensive, pas une autorisation d’upload ni une
validation de contenu métier. Les erreurs proxy restent génériques.

Il n’y a pas de HTTPS local dans cette phase.

## Persistance et sauvegardes

`docker:down` conserve les trois volumes. `npm run db:backup` délègue à `backup:create` et produit
une archive PostgreSQL chiffrée sous `.local/backups/postgres/`, accompagnée d’un manifeste sous
`.local/backup-manifests/`. `npm run db:restore:test` restaure cette archive dans un conteneur
PostgreSQL éphémère avec `pg_restore --no-owner --no-privileges`, sans port hôte ni volume
persistant.

Une future procédure de sauvegarde devra :

1. identifier explicitement les trois volumes `promptube_admin_*` ;
2. produire des exports cohérents sans inclure de secret dans les logs ;
3. copier les sauvegardes hors du disque Docker ;
4. définir rétention et rotation ;
5. restaurer dans des volumes de test distincts ;
6. documenter la preuve de restauration.

Git ne remplace jamais cette sauvegarde.

Une restauration devra partir de sauvegardes contrôlées, créer des ressources de test distinctes,
restaurer les données sans afficher de secret, vérifier les propriétaires et exécuter les
healthchecks. Elle ne doit jamais cibler ni monter un volume `infrastructure_*` ou `promptube-prod`.

## Rollback

Pour revenir au code fusionné sans supprimer de données :

```bash
npm run docker:down
git switch develop
```

La branche Docker et les volumes restent disponibles pour inspection. Une annulation ultérieure des
commits doit utiliser `git revert` après validation ; aucun `reset --hard`, rebase ou nettoyage
destructif n’est autorisé.

`promptube-prod` possède son propre dépôt, ses propres réseaux, volumes, secrets et workflows. Cette
stack ne doit jamais y être copiée, connectée ou fusionnée.

## Limites de sécurité

Cette stack reste locale, liée à loopback et sans HTTPS. Elle n’autorise ni exposition publique, ni
upload d’image non fiable, ni CSS utilisateur. Les résultats et limites des scans d’images sont
suivis dans [`security-debt.md`](security-debt.md). L’absence d’avis détecté ne constituerait pas à
elle seule une preuve d’absence de vulnérabilité.

Le scan Trivy officiel du 28 juillet 2026 ne détecte aucun avis high/critical dans Redis ou le proxy
actualisé. Il conserve un high `sharp` dans l’application, un critical non atteignable dans le
contexte gRPC de MinIO, ainsi qu’un critical non atteignable dans l’usage local de `gosu` par
PostgreSQL. Ces avis et leurs high associés restent ouverts et bloquent toute promotion vers la
production ; leur analyse détaillée se trouve dans le registre.
