# État opérationnel local

## Status

```bash
npm run ops:status
```

La commande affiche uniquement des informations non sensibles :

- branche Git et propreté ;
- présence et permissions des secrets requis ;
- dernier backup validé, SHA-256 abrégé et taille ;
- projets Compose ;
- volumes `promptube_admin_*` ;
- espace disque disponible.

Elle fonctionne même lorsque la stack est arrêtée.

## Séquence pré-premier-admin

Avant de créer le premier compte réel :

```bash
npm run docker:secrets:init
npm run docker:up
npm run db:provision
npm run db:migrate
npm run backup:create
npm run backup:verify
npm run backup:restore:test
npm run docker:down
```

Ensuite seulement, le propriétaire peut lancer `npm run admin:bootstrap`.

## Audit opérationnel

Les opérations persistantes sensibles écrivent des événements minimaux dans `admin_audit_events` :

- `BACKUP_CREATED` avant le dump, donc inclus dans le backup ;
- `BACKUP_VERIFIED` après vérification, donc non inclus dans le backup venant d’être créé ;
- événements de restauration/rotation réservés aux opérations réelles documentées.

Les métadonnées ne contiennent que le type d’opération et l’identifiant de backup, jamais le chemin
absolu, le contenu, la clé, un mot de passe, un cookie ou un token.
