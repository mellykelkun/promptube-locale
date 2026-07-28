# Workflow des versions de module

## Statuts

```text
DRAFT
  → IN_REVIEW
  → APPROVED
  → SUPERSEDED

IN_REVIEW
  → DRAFT
```

`APPROVED` signifie uniquement « approuvé localement ». Ce statut ne publie rien vers
`promptube-prod`.

## Règles

- `version_number` commence à 1 et reste unique par module ;
- une seule version `DRAFT` ou `IN_REVIEW` peut exister par module ;
- une seule version `APPROVED` active peut exister par module ;
- `APPROVED` et `SUPERSEDED` sont immuables ;
- aucun passage direct `DRAFT → APPROVED` n’est autorisé ;
- aucune transition arbitraire n’est autorisée ;
- aucune suppression physique n’est exposée.

## Approbation et supersession

L’approbation d’une version `IN_REVIEW` s’exécute en transaction PostgreSQL :

1. verrouillage de la version cible ;
2. vérification de la révision attendue ;
3. passage de l’ancienne version `APPROVED` à `SUPERSEDED`, si elle existe ;
4. passage de la nouvelle version à `APPROVED` ;
5. écriture des événements d’audit.

Si l’audit échoue, l’opération sensible ne doit pas être présentée comme réussie.

## Nouvelle version

Créer une nouvelle version depuis une version approuvée copie le contenu Markdown et le changelog
dans un nouveau brouillon. Cela permet de travailler sur une version suivante sans modifier l’état
approuvé localement.

## Concurrence

Chaque objet catalogue possède une colonne `revision`. Les formulaires envoient la révision affichée
et les mises à jour exigent cette révision dans la clause `WHERE`. Si aucune ligne n’est modifiée,
l’opération retourne un conflit et écrit `CATALOG_CONFLICT_DETECTED` après rollback de la
transaction échouée.

## Archivage

- catégorie : refus si sous-catégorie active ;
- sous-catégorie : refus si module actif ;
- module : refus si une version est `IN_REVIEW` ;
- version : jamais supprimée.

La restauration d’un enfant est refusée si son parent reste archivé.

## Audit

Les événements catalogue enregistrent uniquement des métadonnées minimales : identifiants, type
d’objet, changement de statut, champs modifiés et révisions. Le contenu Markdown complet, les
descriptions complètes, cookies, tokens, mots de passe, secrets TOTP, codes de secours et secrets
Docker sont interdits dans l’audit.
