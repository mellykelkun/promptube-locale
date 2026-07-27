# Changelog local

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
