# Reprise après incident locale

## Objectif

La reprise locale vérifie qu’un backup PostgreSQL chiffré peut être restauré dans une base isolée
sans utiliser les volumes persistants, les secrets réels de test ou le compte personnel du
propriétaire.

## Test automatisé

```bash
npm run disaster-recovery:test
```

Le test :

1. démarre `promptube_admin_restore_test` ;
2. applique la migration SQL versionnée sur une base temporaire ;
3. insère des données factices non personnelles ;
4. crée un backup chiffré avec une clé temporaire ;
5. restaure dans une seconde base temporaire ;
6. vérifie les tables, migrations et comptages attendus ;
7. détruit conteneurs/réseaux temporaires ;
8. supprime les secrets temporaires.

Il ne restaure jamais dans `promptube_admin`, ne démarre pas l’application avec des sessions
restaurées et ne crée aucun compte réel.

## Restauration réelle manuelle

Une restauration réelle dans la base persistante n’est pas automatisée dans cette phase. Elle doit
être décidée explicitement, précédée d’une sauvegarde supplémentaire, exécutée hors service, et
documentée dans `CHANGELOG.local.md`.

Une sauvegarde peut contenir des sessions Better Auth encore actives. Après restauration réelle et
avant réouverture de l’administration, toutes les sessions doivent être révoquées localement :

```bash
npm run admin:sessions:revoke-all
```

Cette commande ne restaure pas, ne supprime pas d’utilisateur et ne modifie pas les secrets TOTP.

Interdictions permanentes :

- pas de `docker compose down -v` ;
- pas de prune ;
- pas de suppression de volume ;
- pas de restauration dans production ;
- pas d’affichage de clé ou de contenu de backup.
