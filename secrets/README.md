# Secrets Docker locaux

Ce dossier reçoit uniquement les fichiers secrets locaux suivants :

- `postgres-password` ;
- `postgres-app-password` ;
- `postgres-migration-password` ;
- `postgres-backup-password` ;
- `redis-password` ;
- `better-auth-secret` ;
- `backup-encryption-key` ;
- `object-storage-password`.

Ils sont créés avec `npm run docker:secrets:init`, restent ignorés par Git et doivent conserver des
permissions `600`. Leur contenu ne doit jamais être affiché, copié dans un document, ajouté à une
image ou transmis à `promptube-prod`.

Les fichiers `*.example` décrivent seulement le format attendu et ne sont jamais utilisés par
Compose.

La création applique `umask 077`, génère 32 octets aléatoires sous forme hexadécimale avec OpenSSL
dans un fichier temporaire du même dossier, valide ce temporaire, puis le renomme atomiquement. Un
secret existant n’est jamais régénéré. Sa permission peut être normalisée à `600` seulement après
avoir établi qu’il s’agit d’un fichier régulier non vide, non symbolique et résolu exactement dans
ce dossier.

`postgres-password` sert uniquement au bootstrap PostgreSQL. `postgres-migration-password` sert aux
migrations Drizzle, `postgres-app-password` au runtime Next.js et `postgres-backup-password` au rôle
lecture seule utilisé par `pg_dump`. Le secret bootstrap et le secret backup ne sont jamais montés
dans le conteneur applicatif.

`backup-encryption-key` chiffre les sauvegardes PostgreSQL locales. Elle doit être sauvegardée
séparément des archives : sans elle, les backups existants sont irrécupérables. Elle ne doit jamais
être stockée dans `.local/backups`, copiée dans une image ou incluse dans un manifeste.

Le démarrage refuse un secret manquant, vide, spécial, symbolique, extérieur au dossier ou dont le
mode diffère de `600`. Les montages Compose sont ensuite contrôlés dans chaque conteneur ; les
attributs `mode`, `uid` ou `gid` de la syntaxe Compose ne sont pas considérés à eux seuls comme une
garantie pour un secret issu d’un fichier hôte.

Sauvegarder ces fichiers séparément des volumes, dans un support chiffré et à accès restreint. Une
restauration doit préserver les noms exacts et le mode `600`, puis être validée avec
`npm run docker:config` sans jamais imprimer le contenu.

Les tests `npm run test:auth:all`, `npm run disaster-recovery:test` et
`npm run secrets:rotation:test` n’utilisent pas ces secrets réels. Ils créent des dossiers
temporaires dans le dépôt, y génèrent des secrets éphémères en mode `600`, les montent uniquement
dans leurs projets Compose isolés, puis suppriment ces dossiers avec un `trap`. Ces secrets de test
ne doivent jamais être copiés, journalisés ou versionnés.
