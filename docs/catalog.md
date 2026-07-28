# Catalogue local admin

## Portée

Le catalogue local permet à un administrateur authentifié avec TOTP de préparer les catégories,
sous-catégories, modules et versions de modules dans l’administration locale Promptube.

Cette fonctionnalité ne publie rien vers `promptube-prod`, ne démarre pas MinIO, n’ajoute aucun
upload, aucune image, aucun ZIP, aucun paiement, aucune commande et aucun utilisateur client.

## Entités

### Catégorie

Table `catalog_categories` :

- `id` UUID généré côté serveur ;
- `name`, `slug`, `description`, `sort_order` ;
- `archived_at` pour l’archivage logique ;
- `revision` pour le verrouillage optimiste ;
- `created_by`, `updated_by`, `created_at`, `updated_at`.

Le slug est globalement unique. Une catégorie active ne peut pas être archivée si elle contient une
sous-catégorie active.

### Sous-catégorie

Table `catalog_subcategories` :

- relation obligatoire vers `catalog_categories` ;
- slug unique dans sa catégorie ;
- archivage logique et révision.

Une sous-catégorie active ne peut pas appartenir à une catégorie archivée. Elle ne peut pas être
archivée si elle contient un module actif.

### Module

Table `catalog_modules` :

- relation obligatoire vers `catalog_subcategories` ;
- `title`, `slug`, `summary`, `locale` ;
- slug globalement unique ;
- archivage logique et révision.

Le module représente l’identité stable du contenu. Il ne contient ni prix, ni fichier, ni image, ni
état de publication production.

### Version de module

Table `catalog_module_versions` :

- relation obligatoire vers `catalog_modules` ;
- `version_number` unique par module ;
- `workflow_status` ;
- `content_markdown` stocké comme texte ;
- `changelog`, révision, auteurs et dates de revue/approbation.

Une seule version mutable (`DRAFT` ou `IN_REVIEW`) est autorisée par module. Une seule version
`APPROVED` active est autorisée par module.

## Sécurité Markdown

Le Markdown est validé, borné et stocké en texte. Il n’est pas rendu en HTML dans cette phase. Les
sauts de ligne et tabulations nécessaires au Markdown sont autorisés ; les caractères de contrôle
dangereux restent refusés.

Aucune image distante, script, CSS utilisateur ou rendu externe n’est exécuté.

## Accès et autorisation

Toutes les pages et mutations catalogue nécessitent :

- session Better Auth valide ;
- administrateur actif ;
- rôle admin ;
- TOTP complété ;
- session non expirée et non révoquée.

Les capacités internes sont centralisées :

- `catalog:read` ;
- `catalog:create` ;
- `catalog:update` ;
- `catalog:review` ;
- `catalog:approve` ;
- `catalog:archive`.

Le rôle admin actuel possède toutes ces capacités. Cette politique prépare de futurs rôles sans
ajouter de RBAC avancé en base dans cette phase.

## Recherche, filtres et pagination

Les listes utilisent des requêtes PostgreSQL paramétrées, une pagination bornée à 50 lignes et un
tri déterministe. Les filtres disponibles couvrent l’état actif/archivé, le workflow, la catégorie,
la sous-catégorie, la locale et la recherche simple sur les noms, slugs, titres et résumés.

Il n’y a aucun moteur externe ni recherche plein texte avancée.

## Tests

```bash
npm run test:catalog:all
```

La suite réutilise `promptube_admin_test` avec PostgreSQL et Redis en `tmpfs`, sans volumes réels,
sans secrets réels, sans MinIO et sans compte personnel. Elle applique toutes les migrations, crée
un administrateur temporaire, active le TOTP, vérifie le workflow catalogue, les droits SQL, les
conflits de révision, l’audit, la recherche, les filtres, la pagination et le nettoyage complet.

## Migration persistante

La migration catalogue persistante doit toujours être encadrée par :

1. un backup chiffré pré-catalogue vérifié et restauré ;
2. l’application explicite de `db:migrate` avec le compte migration ;
3. la vérification que les tables catalogue réelles sont vides après migration ;
4. un backup chiffré post-migration vérifié et restauré.

La phase du 28 juillet 2026 a créé les points `postgres-2026-07-28T19-46-27-333Z-aecadb76` et
`postgres-2026-07-28T19-48-42-239Z-6ac47375`. Le second contient le schéma catalogue sans données
catalogue réelles.
