# Sauvegardes PostgreSQL locales

## Sources de vérité

PostgreSQL est la source de vérité locale pour les administrateurs, comptes Better Auth, sessions
persistantes, configuration TOTP, codes de secours gérés par Better Auth, journal d’audit et
migrations. Redis contient seulement des compteurs temporaires avec TTL et peut être reconstruit.
MinIO reste hors profil par défaut et n’est pas sauvegardé dans cette phase.

## Destination

Par défaut, les artefacts sont écrits sous `.local/`, ignoré par Git et Docker :

```text
.local/
├── backups/postgres/
├── backup-manifests/
├── restore-tests/
└── reports/
```

`PROMPTUBE_BACKUP_DIR` peut sélectionner une autre destination. Une destination hors dépôt exige
`PROMPTUBE_ALLOW_EXTERNAL_BACKUP_DIR=1`, afin d’éviter une écriture externe implicite. Cette
destination locale reste sur le même disque : elle ne remplace pas une copie chiffrée hors machine.

## Format

`backup:create` utilise `pg_dump --format=custom`, sans rôles globaux, sans mots de passe de rôles,
sans Redis, sans MinIO et sans fichiers du projet. Le dump est chiffré en flux avant d’être écrit.
Aucun dump PostgreSQL persistant en clair n’est produit. Les tests de restauration utilisent
`pg_restore --no-owner --no-privileges` afin de restaurer dans un PostgreSQL isolé sans recréer les
propriétaires locaux.

Le format chiffré `PTBK1` utilise AES-256-GCM avec IV aléatoire unique. La clé provient de
`secrets/backup-encryption-key`, fichier hexadécimal de 32 octets en mode `600`. La clé n’est jamais
stockée dans l’archive, le manifeste ou le rapport.

## Manifeste

Chaque backup possède un manifeste JSON séparé avec identifiant, date UTC, taille, SHA-256 du
fichier chiffré, format PostgreSQL, migration courante, algorithme et MAC HMAC-SHA-256 dérivée de la
clé de backup. Le manifeste ne contient ni chaîne de connexion, ni hôte interne, ni email, ni
contenu de table, ni secret.

## Commandes

```bash
npm run backup:create
npm run backup:list
npm run backup:verify
npm run backup:restore:test
```

`backup:restore:test` restaure dans `promptube_admin_restore_test`, un projet Compose isolé en
`tmpfs`, sans port hôte, sans volume persistant et sans partage avec `promptube_admin`.

## Rétention

Politique locale MVP :

- 7 sauvegardes récentes ;
- 4 représentants hebdomadaires ;
- 6 représentants mensuels ;
- la sauvegarde validée la plus récente est toujours protégée.

La suppression est en deux étapes :

```bash
npm run backup:retention:dry-run
PROMPTUBE_RETENTION_CONFIRM=delete-expired-backups npm run backup:retention:apply
```

Aucune suppression n’est exécutée pendant `backup:create`.
