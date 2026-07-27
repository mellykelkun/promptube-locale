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
