# Secrets Docker locaux

Ce dossier reçoit uniquement les trois fichiers secrets locaux suivants :

- `postgres-password` ;
- `redis-password` ;
- `object-storage-password`.

Ils sont créés avec `npm run docker:secrets:init`, restent ignorés par Git et doivent conserver des
permissions `600`. Leur contenu ne doit jamais être affiché, copié dans un document, ajouté à une
image ou transmis à `promptube-prod`.

Les fichiers `*.example` décrivent seulement le format attendu et ne sont jamais utilisés par
Compose.
