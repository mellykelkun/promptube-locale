# Changelog local

## 2026-07-27

- Initialisation du socle Next.js avec `create-next-app` 16.2.12.
- Activation de TypeScript, ESLint, Tailwind CSS, App Router et du dossier `src`.
- Configuration de l’alias d’import `@/*`.
- React Compiler et initialisation Git désactivés.
- Aucun service Docker, stockage, base de données ou fonctionnalité métier ajouté.
- Remplacement de `next/font/google` par des piles de polices système afin que
  le build ne télécharge aucune police externe.
- Alignement documentaire sur l’architecture Git validée : dépôt admin local
  indépendant sans remote, branches séparées de la production et sauvegardes
  de données toujours obligatoires. Aucun dépôt Git n’a été initialisé.
