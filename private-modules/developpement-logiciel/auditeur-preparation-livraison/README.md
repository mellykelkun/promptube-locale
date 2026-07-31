# Promptube Auditeur logiciel et préparation à la livraison

Statut du paquet : préversion interne privée.

Ce module encadre un audit défensif de préparation à la livraison. Il collecte les preuves, classe
les constats, vérifie les corrections et produit un verdict honnête.

## Verdicts possibles

- READY ;
- READY_WITH_ACCEPTED_RISKS ;
- NOT_READY.

Le module ne peut jamais accepter un risque. Seul le propriétaire ou une personne autorisée peut
accepter un risque résiduel avec justification et responsable identifié.

## Mode d’utilisation

Lire `instructions/role-auditeur.md`, appliquer `rules/verdict-risques.md` puis suivre
`workflows/audit-livraison.md`.
