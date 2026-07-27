# Infrastructure Docker locale de l’administration

## Portée

Cette stack sert exclusivement au développement et à la validation locale de l’administration
Promptube. Elle ne contient aucune donnée métier, migration, authentification ou connexion à
`promptube-prod`.

Le nom Compose est fixé à `promptube_admin`. Les noms de services sont préfixés `admin-promptube-*`,
sans `container_name`, afin que Compose conserve l’isolation et la gestion de leur cycle de vie.

## Versions verrouillées

| Composant      | Référence                                          |
| -------------- | -------------------------------------------------- |
| Application    | `admin-promptube-app:0.1.0`                        |
| Node.js        | `node:24.18.0-alpine3.23`                          |
| Reverse proxy  | `admin-promptube-reverse-proxy:1.29.4`             |
| Nginx de base  | `nginxinc/nginx-unprivileged:1.29.4-alpine`        |
| PostgreSQL     | `postgres:18.4-alpine3.23`                         |
| Redis          | `redis:8.6.5-alpine3.23`                           |
| Stockage objet | `admin-promptube-object-storage:2025-09-07`        |
| MinIO de base  | `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` |

Les images de base sont également verrouillées par digest dans les Dockerfiles et `compose.yaml`.
Les digests doivent être revérifiés explicitement lors d’une mise à jour de version.

L’image communautaire MinIO retenue est la dernière release publiée par le projet, mais son dépôt
Docker Hub est désormais archivé. Elle reste adaptée à cette évaluation locale isolée. Son maintien
ou son remplacement par une solution S3 activement maintenue doit être décidé et soumis à une revue
de sécurité avant toute utilisation de production.

L’hôte de validation ne fournit actuellement ni Docker Scout, ni Trivy, ni Grype. Les références,
digests, Dockerfiles et comportements d’exécution ont été contrôlés, mais cela ne constitue pas une
analyse CVE des images. Une analyse avec un scanner maintenu, suivie du traitement des avis `high`
et `critical`, est obligatoire avant toute exposition hors du poste local ou promotion vers la
production. Aucun scanner n’a été installé globalement pendant cette phase.

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
      │
      │ promptube_admin_backend (internal)
      ├──────────────────────────┬───────────────────────────┐
      ▼                          ▼                           ▼
admin-promptube-postgres  admin-promptube-redis  admin-promptube-object-storage
```

Seul le reverse proxy publie un port. L’application et les ports internes `5432`, `6379`, `9000` et
`9001` ne possèdent aucun binding hôte. Le proxy ne rejoint pas le réseau backend.

## Port local

`8080` a été choisi le 27 juillet 2026 après vérification de `8080`, `8088` et `18080`, tous libres.
La valeur peut être adaptée dans `.env.docker` après un nouvel inventaire avec `ss -ltnup`. Elle
doit toujours rester liée à `127.0.0.1`.

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
- `secrets/object-storage-password`.

Chaque fichier réel est ignoré par Git et protégé en mode `600`. Les fichiers `*.example` ne
contiennent que des marqueurs factices et ne sont jamais utilisés par Compose.

PostgreSQL et MinIO utilisent respectivement `POSTGRES_PASSWORD_FILE` et `MINIO_ROOT_PASSWORD_FILE`.
Redis lit son secret au démarrage et écrit une configuration en mode `600` dans un `tmpfs`, afin que
le mot de passe ne figure ni dans Compose ni dans la ligne de commande du processus.

## Commandes

Validation et construction :

```bash
npm run docker:config
npm run docker:build
```

Démarrage avec attente des healthchecks :

```bash
npm run docker:up
npm run docker:health
npm run docker:verify
```

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
commande `prune`, ou de supprimer manuellement un volume, réseau ou conteneur étranger.

## Healthchecks

- proxy : `GET /nginx-health` ;
- application : `GET /api/health` ;
- PostgreSQL : `pg_isready` avec les identifiants non sensibles ;
- Redis : `redis-cli ping` authentifié par le secret monté ;
- MinIO : `GET /minio/health/live`.

`npm run docker:verify` contrôle aussi les réponses HTTP via le proxy, les en-têtes, les bindings de
ports, les labels Compose, les réseaux, les volumes, le montage des secrets, l’absence de secret
dans les logs, l’absence de fichier `.env` dans l’image finale et l’absence de Google Fonts.

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
`X-Forwarded-Proto`, `X-Request-ID` et `X-Correlation-ID`. Les délais sont bornés et les en-têtes de
sécurité applicatifs ne sont pas dupliqués.

Il n’y a pas de HTTPS local dans cette phase.

## Persistance et sauvegardes

`docker:down` conserve les trois volumes. Avant toute donnée réelle, il faudra mettre en place une
sauvegarde chiffrée séparée pour PostgreSQL, Redis si sa persistance devient nécessaire, le stockage
objet et les secrets, puis tester une restauration complète.

Une future procédure de sauvegarde devra :

1. identifier explicitement les trois volumes `promptube_admin_*` ;
2. produire des exports cohérents sans inclure de secret dans les logs ;
3. copier les sauvegardes hors du disque Docker ;
4. définir rétention et rotation ;
5. restaurer dans des volumes de test distincts ;
6. documenter la preuve de restauration.

Git ne remplace jamais cette sauvegarde.

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
