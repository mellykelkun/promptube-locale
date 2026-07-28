# Changelog local

## 2026-07-28

### Correctif bootstrap administrateur local

- Correction de la saisie interactive du mot de passe de `npm run admin:bootstrap` afin d’éviter
  l’AbortError à la confirmation et de ne pas mélanger `readline` avec la lecture brute du terminal.

### Fondation d’exploitation locale post-authentification

- Ajout d’un workflow de sauvegarde PostgreSQL chiffrée AES-256-GCM sans dump persistant en clair,
  avec manifeste JSON, SHA-256 et MAC HMAC.
- Ajout du rôle PostgreSQL `POSTGRES_BACKUP_USER` en lecture seule et des secrets
  `postgres-backup-password` et `backup-encryption-key`.
- Ajout des environnements isolés `promptube_admin_restore_test` et `promptube_admin_rotation_test`,
  sans port hôte ni volume persistant.
- Ajout des commandes `ops:status`, `backup:*`, `secrets:rotation:*`, `disaster-recovery:test` et
  `test:operations`.
- Correction de l’idempotence `db:migrate` sur un baseline déjà matérialisé, des droits de lecture
  backup sur les séquences et de la restauration isolée avec `pg_restore --no-owner`.
- Validation de la rotation Redis par recréation ciblée du conteneur avec volume conservé, et non
  par simple redémarrage.
- Documentation des sources de vérité, de la rétention locale, de la rotation des secrets et de la
  reprise après incident avant création du premier administrateur réel.

### Fondation identité et accès locale

- Ajout de l’environnement d’intégration isolé `promptube_admin_test` sans volume nommé, sans port
  hôte, sans secret réel et sans MinIO.
- Ajout du parcours navigateur Playwright complet pour l’admin temporaire : login, TOTP, challenge
  2FA, code de secours à usage unique, logout, révocation, expiration, rate limiting, audit et
  readiness PostgreSQL/Redis.
- Correction de la révocation explicite de session au logout et de la redirection intermédiaire
  `/verify-2fa` pendant le challenge second facteur.
- Séparation du préfixe Redis de test `promptube:test:` et durées de test courtes limitées à
  `APP_ENV=test`.
- Ajout de Drizzle ORM, du schéma PostgreSQL versionné et d’une migration SQL initiale générée.
- Création de rôles PostgreSQL séparés : bootstrap, migration et runtime applicatif.
- Ajout du provisioning idempotent, de l’application explicite des migrations, du statut, du backup
  PostgreSQL et d’un test de restauration en conteneur éphémère.
- Connexion serveur uniquement à PostgreSQL et Redis, sans exposition de mot de passe ou URL de
  connexion.
- Ajout de Better Auth avec email/mot de passe, inscription publique désactivée, hachage Argon2id,
  TOTP obligatoire, sessions serveur révocables et rate limiting Redis.
- Ajout de la commande interactive locale `admin:bootstrap` pour créer le premier administrateur
  sans transmettre le mot de passe en argument, variable Compose ou fichier.
- Ajout d’un journal d’audit persistant `admin_audit_events` sans mot de passe, token, cookie,
  secret TOTP ou code de secours.
- Séparation de `/api/health/live` et `/api/health/ready`, le readiness vérifiant PostgreSQL et
  Redis sans publier d’information interne.
- Retrait de MinIO du démarrage par défaut via le profil explicite `storage`, sans supprimer son
  image ni son volume.
- Extension des tests de secrets, du wrapper Compose, de la politique de mot de passe, de la lecture
  de secrets, de la configuration et du liveness.

### Durcissement final de la fondation Docker

- Remplacement de la release MinIO de septembre 2025 par la release officielle
  `RELEASE.2025-10-15T17-29-55Z`, construite depuis le commit officiel verrouillé et une archive
  vérifiée par SHA-256, l’image OCI exacte n’étant plus disponible.
- Construction multi-stage du stockage objet avec une image finale Alpine non-root sans code source
  ni compilateur ; MinIO reste strictement local et doit être remplacé avant toute production.
- Compilation du binaire avec Go 1.25.12 stable et actualisation du proxy vers Nginx 1.31.3 sur
  Alpine 3.24 afin d’intégrer les correctifs disponibles sans dépendance flottante.
- Retrait de npm et Corepack de l’image Next.js finale, inutiles au lancement de `server.js`.
- Séparation explicite de `APP_ENV=local` et `NODE_ENV=production`, avec validation Zod et tests.
- Suppression des dépendances de démarrage artificielles de l’application vers PostgreSQL, Redis et
  le stockage objet ; le réseau backend a ensuite été réintroduit lors de la connexion réelle à
  PostgreSQL et Redis.
- Durcissement atomique des secrets locaux et refus des liens symboliques, fichiers spéciaux, vides,
  hors périmètre ou insuffisamment protégés.
- Ajout de tests shell isolés pour la génération de secrets et le wrapper Compose.
- Séparation des commandes Compose selon leurs besoins : les inspections et `docker:down` restent
  utilisables sans secret, sans suppression de volume.
- Renforcement des contrôles d’intégration sur les ports, réseaux, volumes, utilisateurs,
  capabilities, systèmes de fichiers, `tmpfs`, secrets, images et métadonnées Docker.
- Remplacement des identifiants de requête fournis par le client par des identifiants générés par
  Nginx et réduction des données journalisées par le proxy.
- Scan des cinq images avec Trivy officiel épinglé, remédiation des avis critiques de l’application
  et du proxy, et consignation des avis transitifs non atteignables qui bloquent toute production.

## 2026-07-27

- Initialisation du socle Next.js avec `create-next-app` 16.2.12.
- Activation de TypeScript, ESLint, Tailwind CSS, App Router et du dossier `src`.
- Configuration de l’alias d’import `@/*`.
- React Compiler et initialisation Git désactivés.
- Aucun service Docker, stockage, base de données ou fonctionnalité métier ajouté.
- Remplacement de `next/font/google` par des piles de polices système afin que le build ne
  télécharge aucune police externe.
- Alignement documentaire sur l’architecture Git validée : dépôt admin local indépendant sans
  remote, branches séparées de la production et sauvegardes de données toujours obligatoires.
- Initialisation ultérieure du dépôt Git local avec `main` et `develop`, sans remote.

### Fondation technique de l’administration

- Création de la branche locale `chore/admin-foundation` depuis `develop`.
- Ajout des scripts reproductibles de formatage, lint, typecheck, tests, couverture, build et
  contrôle global.
- Configuration de Prettier, Vitest, Testing Library, jsdom et de la couverture V8.
- Ajout de Zod pour valider la configuration serveur et publique, sans secret ni variable de service
  fictive.
- Mise en place de la frontière `server-only`, des erreurs applicatives typées, des réponses HTTP
  sûres, des identifiants de corrélation et des logs JSON avec redaction.
- Ajout d’en-têtes HTTP de sécurité raisonnables et suppression de `X-Powered-By`.
- Création de `GET /api/health` avec validation des entrées et réponse non sensible.
- Remplacement du template create-next-app par un shell d’administration responsive et accessible,
  sans fonctionnalité métier.
- Ajout des pages d’erreur globale, d’erreur de segment et 404.
- Documentation des modules futurs, de l’architecture interne et des protections différées.
- Ajout de tests comportementaux pour la configuration, les erreurs, les logs, la sécurité, le
  healthcheck et le rendu du tableau de bord.
- Aucun service Docker, base de données, remote ou accès à `promptube-prod` ajouté.

### Revue finale de la fondation

- Confirmation que `check` utilise uniquement `format:check` et ne réécrit aucun fichier.
- Ajout de commandes d’audit npm explicites et non modificatives, volontairement séparées de `check`
  tant que les avis connus renvoient un code non nul.
- Ajout de seuils de couverture V8 : 80 % statements, lignes et fonctions, 65 % branches.
- Extension de la redaction des messages de log aux sessions, identifiants et clés privées.
- Correction du schéma des dépendances internes pour préserver la frontière `shared`/`server`.
- Création du registre `docs/security-debt.md` pour les avis transitifs non résolus.

### Fondation Docker locale

- Fusion locale validée de `chore/admin-foundation` dans `develop` avec un merge non fast-forward.
- Création de `chore/admin-docker-foundation` depuis le merge validé.
- Ajout du projet Compose isolé `promptube_admin` et de cinq services préfixés `admin-promptube-*`.
- Publication exclusive du proxy Nginx sur `127.0.0.1:8080`, après inventaire des ports.
- Ajout des réseaux `frontend` et `backend` interne, ainsi que de volumes PostgreSQL, Redis et
  stockage objet propres au projet.
- Ajout de secrets locaux générés, ignorés et contrôlés avec des permissions `600`.
- Ajout d’une image Next.js standalone multi-stage et non-root basée sur Node 24.18.0.
- Épinglage par version et digest de Node, Nginx, PostgreSQL, Redis et MinIO.
- Ajout de healthchecks, restrictions de capacités, systèmes de fichiers en lecture seule et
  `no-new-privileges` lorsque compatibles.
- Ajout de scripts non destructifs pour configurer, construire, démarrer, inspecter, tester et
  arrêter la stack sans supprimer les volumes.
- Aucun schéma, migration, bucket métier ou connexion à `promptube-prod` ajouté.
