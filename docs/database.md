# Base de données locale admin

## Portée

PostgreSQL stocke uniquement les tables d’authentification Better Auth, les sessions et le journal
d’audit administratif local. Aucune donnée métier, catalogue, paiement, commande, fichier ou donnée
de `promptube-prod` n’est créée.

## Rôles PostgreSQL

Trois niveaux sont séparés :

1. `POSTGRES_USER` : compte bootstrap local de l’image PostgreSQL ;
2. `POSTGRES_MIGRATION_USER` : compte propriétaire des migrations et du schéma applicatif ;
3. `POSTGRES_APP_USER` : compte runtime utilisé par Next.js.

Le compte runtime reçoit uniquement `CONNECT`, `USAGE` sur le schéma applicatif, CRUD sur les tables
et droits nécessaires sur les séquences. Il ne crée ni rôle, ni base, ni extension, ni migration. Le
compte bootstrap n’est jamais monté dans le conteneur applicatif.

## Migrations Drizzle

Le projet suit l’approche codebase first :

```bash
npm run db:generate
npm run db:check
npm run db:migrate
npm run db:status
```

`drizzle-kit push` est interdit. Les migrations SQL générées sous `drizzle/` sont versionnées,
revues et appliquées explicitement par service one-shot. Le conteneur de migration applique ces SQL
versionnés avec le compte de migration et ne contient pas les dépendances de développement. Next.js
ne migre jamais la base au démarrage normal.

`npm run test:auth:all` applique les mêmes migrations sur une base PostgreSQL vide dans
`promptube_admin_test`. Ce projet de test utilise des données en `tmpfs`, des rôles et mots de passe
temporaires, et ne partage aucun volume avec la base persistante locale. Le test vérifie aussi que
le compte runtime ne peut pas créer de table, schéma ou rôle, ni supprimer une table.

## Schéma initial

La migration initiale crée :

- `user` ;
- `account` ;
- `session` ;
- `verification` ;
- `twoFactor` ;
- `admin_audit_events` ;
- schéma `drizzle` pour le registre des migrations.

Le journal `admin_audit_events` stocke uniquement action, résultat, acteur éventuel, cible minimale,
identifiant de corrélation, métadonnées nettoyées et horodatage. Il ne doit jamais contenir mot de
passe, hash, cookie, token, secret TOTP, URI TOTP, code de secours ou stack trace.

## Sauvegarde et restauration

Avant une migration sur la base persistante :

```bash
npm run db:backup
npm run db:restore:test
```

Les dumps sont écrits dans `backups/`, ignorés par Git, avec permissions `600` et fichier SHA-256
associé. Le test de restauration utilise un conteneur PostgreSQL éphémère isolé, sans port hôte ni
volume persistant. Les volumes `promptube_admin_*` existants ne sont pas supprimés.
