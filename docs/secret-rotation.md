# Rotation locale des secrets

## Inventaire

Secrets suivis opérationnellement :

- `better-auth-secret` ;
- `postgres-app-password` ;
- `postgres-migration-password` ;
- `postgres-backup-password` ;
- `redis-password` ;
- `backup-encryption-key`.

Les valeurs, hashes et longueurs exactes ne sont jamais documentés.

## Principes

Avant toute rotation réelle :

1. créer et vérifier un backup PostgreSQL chiffré ;
2. arrêter les services concernés si nécessaire ;
3. créer le nouveau fichier secret atomiquement en mode `600` ;
4. appliquer le changement côté service ;
5. redémarrer strictement les services concernés ;
6. vérifier readiness et parcours auth ;
7. conserver une procédure de rollback.

## Cas particuliers

- `better-auth-secret` : Better Auth ne fournit pas ici de mécanisme multi-clé validé. La procédure
  sûre est une coupure contrôlée, révocation/invalidation des sessions, nouvelle clé, puis test
  login/TOTP complet.
- `postgres-app-password` : rotation du rôle runtime, fichier secret, redémarrage application,
  readiness.
- `postgres-migration-password` : rotation du rôle migration, fichier secret, `db:status` et
  `db:migrate` sans nouvelle migration.
- `postgres-backup-password` : rotation du rôle lecture seule, fichier secret,
  `backup:create`/`backup:verify`.
- `redis-password` : rotation coordonnée Redis + secret, recréation ciblée du conteneur Redis avec
  le volume conservé, puis validation du rate limiting. Un simple `restart` ne suffit pas à garantir
  que le secret Compose matérialisé est relu.
- `backup-encryption-key` : ne jamais perdre l’ancienne clé tant que des backups l’utilisent. Les
  anciens backups restent restaurables avec l’ancienne clé ; les nouveaux backups utilisent la
  nouvelle clé.

## Tests

```bash
npm run secrets:rotation:check
npm run secrets:rotation:test
```

`secrets:rotation:test` utilise `promptube_admin_rotation_test`, PostgreSQL/Redis en tmpfs, secrets
temporaires et aucun volume réel. Il vérifie rotations PostgreSQL runtime/migration, recréation
Redis ciblée, rejet de l’ancienne authentification et rotation de clé backup.
