# Base de données locale admin

## Portée

PostgreSQL stocke les tables d’authentification Better Auth, les sessions persistantes, la
configuration TOTP, les codes de secours gérés par Better Auth, le journal d’audit administratif
local, les migrations et le catalogue local. Aucune donnée paiement, commande, fichier, utilisateur
client ou donnée de `promptube-prod` n’est créée. Redis reste temporaire et n’est pas une source de
vérité.

## Rôles PostgreSQL

Quatre niveaux sont séparés :

1. `POSTGRES_USER` : compte bootstrap local de l’image PostgreSQL ;
2. `POSTGRES_MIGRATION_USER` : compte propriétaire des migrations et du schéma applicatif ;
3. `POSTGRES_APP_USER` : compte runtime utilisé par Next.js ;
4. `POSTGRES_BACKUP_USER` : compte lecture seule utilisé par `pg_dump`.

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

Les volumes persistants initialisés avant ce durcissement peuvent contenir le schéma initial avec un
hash de migration historique. `db:migrate` ne réapplique pas le SQL si les tables du baseline sont
déjà matérialisées ; il rafraîchit alors seulement les droits runtime/backup. Les nouvelles bases
vides continuent d’appliquer la migration SQL versionnée.

## Schéma initial et catalogue

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

La migration catalogue `0001_admin_catalog_foundation.sql` ajoute :

- `catalog_categories` ;
- `catalog_subcategories` ;
- `catalog_modules` ;
- `catalog_module_versions`.

Elle contient uniquement des `CREATE TABLE`, contraintes, clés étrangères et index. Elle ne contient
aucun `DROP`, `TRUNCATE`, `DELETE` ni modification inutile des tables Better Auth. Les objets créés
appartiennent au compte de migration. `db:migrate` rafraîchit ensuite les droits runtime et backup :
CRUD pour le compte applicatif, lecture seule pour le compte backup.

## Sauvegarde et restauration

Avant une migration sur la base persistante :

```bash
npm run db:backup
npm run db:restore:test
```

Ces commandes délèguent à `backup:create` et `backup:restore:test`. Les archives sont écrites sous
`.local/backups/postgres/`, chiffrées en AES-256-GCM et accompagnées d’un manifeste HMAC/SHA-256
sous `.local/backup-manifests/`. Aucun dump persistant en clair n’est produit. Le test de
restauration utilise `promptube_admin_restore_test`, sans port hôte ni volume persistant. Les
volumes `promptube_admin_*` existants ne sont pas supprimés.

Après une restauration réelle, les sessions Better Auth restaurées peuvent encore être valides.
Avant de rouvrir l’administration, lancer explicitement :

```bash
npm run admin:sessions:revoke-all
```

La commande est idempotente, ne supprime aucun utilisateur, mot de passe, TOTP ou événement d’audit,
et exige une confirmation hors `APP_ENV=test`.
