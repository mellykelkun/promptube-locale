# Fiche produit — Promptube Développeur méthodique

## Métadonnées

- **Identifiant provisoire :** `promptube-methodical-developer`
- **Version de la fiche :** `0.1.0`
- **Statut :** `DRAFT`
- **Catégorie :** Développement logiciel
- **Position dans le cycle :** pendant l’implémentation
- **Langue initiale :** français
- **Format prévu :** archive ZIP privée composée principalement de fichiers Markdown

## 1. Nom commercial

**Promptube — Développeur méthodique**

Ce nom est retenu pour la version de travail `0.1.0`. Il devra être validé avec l’ensemble des trois
fiches avant le passage au statut `APPROVED`.

## 2. Résumé

Promptube — Développeur méthodique est un module professionnel qui encadre l’utilisation d’une
intelligence artificielle pendant l’implémentation d’un projet logiciel.

Il transforme l’IA en collaborateur de développement discipliné : elle doit comprendre le dépôt,
respecter les décisions existantes, limiter ses modifications, protéger les données, tester son
travail et produire des preuves vérifiables.

Le module ne remplace pas la responsabilité du développeur. Il organise la collaboration afin que
l’utilisateur comprenne, contrôle et valide chaque changement.

## 3. Problème traité

Une IA utilisée sans méthode pendant le développement peut :

- générer trop de code ;
- modifier des fichiers hors périmètre ;
- ignorer les règles du dépôt ;
- contourner les tests ;
- masquer une erreur au lieu d’en corriger la cause ;
- ajouter des dépendances inutiles ;
- employer des pratiques obsolètes ;
- exposer des secrets ;
- mélanger les responsabilités ;
- produire une migration dangereuse ;
- lancer une opération destructive ;
- modifier plusieurs fonctionnalités dans le même changement ;
- déclarer une tâche terminée sans preuve ;
- rendre le code difficile à maintenir.

Ces comportements accélèrent parfois l’écriture initiale, mais augmentent les risques, les
régressions et le coût des corrections.

## 4. Promesse

Aider l’utilisateur à développer avec une IA sans perdre le contrôle du dépôt, de l’architecture, de
la sécurité ou de la qualité.

Le module doit guider chaque changement depuis l’inspection initiale jusqu’au rapport de validation,
avec un périmètre limité, des tests et un historique Git compréhensible.

## 5. Public cible

- développeurs juniors et intermédiaires ;
- étudiants ;
- freelances ;
- fondateurs techniques ;
- petites équipes ;
- mainteneurs de projets existants ;
- développeurs utilisant une IA dans un dépôt Git ;
- utilisateurs ayant déjà cadré leur projet avec le module Promptube — Architecte de projet
  logiciel.

## 6. Prérequis

L’utilisateur doit disposer :

- d’un dépôt ou dossier de projet identifiable ;
- d’un objectif de changement précis ;
- des règles et documentations disponibles du projet ;
- d’un environnement de développement fonctionnel ;
- d’un moyen d’exécuter les contrôles du projet ;
- d’un historique Git lorsque le projet est versionné ;
- de l’autorisation nécessaire pour modifier le projet concerné ;
- d’une sauvegarde adaptée avant toute opération sensible sur les données.

Lorsque le projet n’est pas encore suffisamment cadré, le module doit recommander de revenir à une
phase de conception avant l’implémentation.

## 7. Résultat attendu

À la fin d’une intervention, l’utilisateur doit obtenir :

- un objectif reformulé ;
- un périmètre explicitement limité ;
- l’état initial du dépôt ;
- les fichiers concernés ;
- un plan d’implémentation ;
- les contrats d’entrée et de sortie ;
- les changements réalisés ;
- les tests ajoutés ou adaptés ;
- les contrôles de sécurité pertinents ;
- les migrations et leur rollback lorsqu’elles existent ;
- la documentation mise à jour ;
- les commandes exécutées ;
- les résultats des contrôles ;
- les risques résiduels ;
- un rapport de fin vérifiable ;
- une décision claire sur la préparation à la fusion.

## 8. Périmètre

La version `1.x` cible principalement :

- les applications web ;
- les MVP full-stack ;
- les dépôts Git ;
- les fonctionnalités de taille limitée ou moyenne ;
- les corrections de bugs ;
- les refactorings contrôlés ;
- les changements de dépendances ;
- les migrations versionnées ;
- les tests unitaires et d’intégration ;
- les projets utilisant des contrôles automatisés ;
- les environnements locaux ou conteneurisés.

## 9. Hors périmètre

La version initiale ne doit pas :

- inventer l’architecture d’un projet non cadré ;
- exécuter une refonte complète en une seule intervention ;
- fusionner ou déployer automatiquement sans autorisation ;
- contourner les règles de branche ;
- effectuer un force-push ;
- supprimer des données ou ressources sans validation ;
- manipuler des secrets réels ;
- conduire des actions offensives non autorisées ;
- remplacer une revue humaine sur un système critique ;
- certifier seule qu’un produit est prêt pour la production ;
- modifier le système ou d’autres projets par commodité.

La conception initiale relève du module Promptube — Architecte de projet logiciel. L’audit final
relève du module Promptube — Auditeur logiciel et Release Readiness.

## 10. Arborescence ZIP proposée

```text
promptube-developpeur-methodique/
├── README.md
├── instructions/
│   ├── role-senior-developer.md
│   └── repository-inspection.md
├── rules/
│   ├── git-safety.md
│   ├── dependency-policy.md
│   ├── secrets-policy.md
│   ├── database-migrations.md
│   └── testing-policy.md
├── workflows/
│   ├── feature-development.md
│   ├── bug-investigation.md
│   ├── refactoring.md
│   ├── dependency-upgrade.md
│   └── merge-readiness.md
├── examples/
│   ├── feature-small/
│   ├── bug-complex/
│   └── migration-safe/
└── documentation/
    ├── command-review.md
    ├── failure-analysis.md
    └── report-template.md
```

Cette arborescence reste une proposition produit. Elle sera alignée sur le futur contrat commun des
paquets Promptube avant toute génération ou publication d’archive.

## 11. Règles centrales

Le module doit obliger l’IA à :

- lire les règles et documentations du projet avant de proposer une modification ;
- inspecter l’état Git, la branche et les changements existants ;
- distinguer les fichiers du projet des fichiers appartenant à l’utilisateur ;
- reformuler l’objectif et définir le périmètre ;
- travailler sur une branche dédiée adaptée au changement ;
- préserver les modifications existantes qui ne lui appartiennent pas ;
- limiter chaque intervention à une micro-étape vérifiable ;
- comprendre la cause d’un problème avant de modifier le code ;
- utiliser les documentations officielles et actuelles ;
- justifier toute nouvelle dépendance ;
- ne jamais exposer de secret ;
- ne jamais masquer une erreur pour obtenir un contrôle vert ;
- ne pas modifier une migration déjà publiée ;
- préparer un rollback pour les changements sensibles ;
- demander une autorisation explicite avant toute opération destructive ;
- exécuter les tests pertinents avant la fusion ;
- produire un rapport de fin fondé sur des preuves.

Une erreur de test, de compilation ou de sécurité doit être expliquée. Elle ne doit jamais être
supprimée artificiellement ou ignorée sans décision explicite.

## 12. Workflows prévus

### Développement d’une fonctionnalité

Inspecter le dépôt, reformuler le besoin, définir les critères d’acceptation, identifier les
fichiers, implémenter un lot cohérent, ajouter les tests et vérifier la préparation à la fusion.

### Investigation d’un bug

Reproduire le problème, collecter les preuves, identifier la cause racine, définir la correction
minimale, ajouter un test de non-régression et vérifier les effets secondaires.

### Refactoring contrôlé

Définir le comportement à préserver, limiter le périmètre, établir une base de tests, effectuer les
changements progressivement et prouver l’absence de régression fonctionnelle.

### Mise à jour d’une dépendance

Identifier la raison du changement, consulter les notes de version, vérifier les incompatibilités,
mettre à jour le lockfile, exécuter les contrôles et documenter les risques.

### Préparation à la fusion

Examiner le diff, les fichiers, les migrations, les dépendances, les tests, la documentation, les
risques et les décisions ouvertes avant de produire un verdict.

Chaque workflow doit définir :

- ses préconditions ;
- ses entrées ;
- son périmètre ;
- ses opérations autorisées ;
- ses contrôles ;
- ses preuves ;
- sa condition de fin ;
- son rollback.

## 13. Exemples prévus

### Petite fonctionnalité

Ajouter une fonctionnalité limitée à un projet existant, avec critères d’acceptation, branche
dédiée, tests et documentation.

### Bug complexe

Analyser une erreur dont le symptôme apparaît loin de sa cause réelle, sans appliquer de correction
improvisée.

### Migration sûre

Ajouter une évolution de schéma versionnée avec sauvegarde, application contrôlée, vérification et
procédure de rollback.

Les exemples doivent montrer le raisonnement et les contrôles. Ils ne doivent pas encourager la
copie aveugle d’une stack ou d’une commande.

## 14. Limites

- Le module dépend de l’accès aux règles et au code réellement concernés.
- Il ne peut pas garantir la correction d’un changement qui n’a pas été testé.
- Il ne remplace pas l’autorisation du propriétaire.
- Il ne doit pas inventer la sortie d’une commande ou le résultat d’un test.
- Il ne garantit pas la compatibilité avec toutes les stacks.
- Il ne remplace pas un spécialiste réglementaire ou de sécurité critique.
- Il ne doit pas exécuter une opération irréversible uniquement parce qu’elle est techniquement
  possible.
- Il ne doit pas considérer une compilation réussie comme une preuve suffisante de qualité.
- Il ne doit pas cacher une dette ou un risque résiduel.
- Il ne doit pas fusionner plusieurs changements indépendants dans le même lot.

## 15. Critères de qualité

Une intervention est réussie lorsque :

- l’objectif est compris ;
- le périmètre est limité ;
- la branche est correcte ;
- l’état initial du dépôt est connu ;
- les fichiers modifiés sont justifiés ;
- aucune modification hors sujet n’est introduite ;
- les dépendances ajoutées sont nécessaires ;
- les entrées sont validées ;
- les erreurs sont traitées explicitement ;
- les secrets sont protégés ;
- les migrations sont versionnées ;
- les tests pertinents passent ;
- le build passe lorsqu’il est applicable ;
- la documentation est alignée ;
- le diff est lisible ;
- le rollback est expliqué ;
- les risques résiduels sont visibles ;
- la préparation à la fusion est démontrée.

## 16. Compatibilité avec les IA

La compatibilité doit être évaluée selon les capacités réelles de l’IA et de l’environnement
utilisé.

L’IA doit pouvoir :

- lire plusieurs fichiers ;
- respecter des instructions hiérarchisées ;
- analyser du code et des diffs ;
- interpréter des sorties de commandes ;
- suivre un périmètre de modification ;
- expliquer ses décisions ;
- signaler ses incertitudes ;
- distinguer une proposition d’une action exécutée.

Les fonctions d’édition, de terminal, de Git ou de navigation doivent être considérées comme des
capacités optionnelles. Le module doit rester utilisable en mode guidé lorsque l’utilisateur exécute
lui-même les opérations.

Chaque version publiée devra préciser les modèles, interfaces et modes de travail réellement testés.

## 17. Politique de mise à jour

Le module utilisera un versionnage sémantique :

- `PATCH` pour les corrections rédactionnelles ou les précisions sans changement de méthode ;
- `MINOR` pour les nouveaux workflows, contrôles, stacks ou exemples compatibles ;
- `MAJOR` pour une modification incompatible du contrat d’intervention ou des règles de sécurité.

Chaque mise à jour devra documenter :

- les fichiers concernés ;
- les nouvelles capacités ;
- les règles modifiées ;
- les éventuelles incompatibilités ;
- les nouvelles pratiques prises en charge ;
- les pratiques devenues obsolètes ;
- la matrice de compatibilité testée.

Les recommandations dépendant d’un outil ou d’une bibliothèque doivent être réévaluées lorsque leurs
versions évoluent.

## 18. Critères de test utilisateur

Le test initial doit vérifier si l’utilisateur :

- comprend la méthode avant de commencer ;
- identifie correctement la branche et le périmètre ;
- sait distinguer inspection, modification et validation ;
- réduit les modifications inutiles produites par l’IA ;
- comprend les fichiers modifiés ;
- détecte plus facilement une proposition dangereuse ;
- obtient des tests et des preuves exploitables ;
- sait interpréter le rapport de fin ;
- conserve le contrôle des commits et des opérations sensibles ;
- estime avoir réduit les régressions ;
- souhaite réutiliser la méthode ;
- accepterait de payer pour le produit.

Les tests doivent relever les étapes trop longues, les instructions ambiguës, les contrôles
inutiles, les erreurs non détectées et les situations où l’utilisateur perd le contrôle du travail.

## 19. Décisions différées

Les éléments suivants seront validés après comparaison des trois fiches :

- prix ;
- licence commerciale ;
- durée d’accès aux mises à jour ;
- compatibilités officiellement garanties ;
- intégrations Git officiellement documentées ;
- environnements d’exécution officiellement testés ;
- responsabilité exacte entre utilisateur et IA ;
- contrat commun du paquet ;
- manifeste versionné.
