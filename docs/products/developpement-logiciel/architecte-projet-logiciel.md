# Fiche produit — Promptube Architecte de projet logiciel

## Métadonnées

- **Identifiant provisoire :** `promptube-software-architect`
- **Version de la fiche :** `0.1.0`
- **Statut :** `IN_REVIEW`
- **Catégorie :** Développement logiciel
- **Sous-catégorie :** Ingénierie logicielle assistée par IA
- **Position dans le cycle :** avant l’implémentation
- **Langue initiale :** français
- **Format prévu :** archive ZIP privée composée principalement de fichiers Markdown

## 1. Nom commercial

**Promptube — Architecte de projet logiciel**

Ce nom est retenu pour la version de travail `0.1.0`. Il devra être validé avec l’ensemble des trois
fiches avant le passage au statut `APPROVED`.

## 2. Résumé

Promptube — Architecte de projet logiciel est un module professionnel qui aide un utilisateur à
transformer une idée brute en un projet logiciel cadré, cohérent et vérifiable avant de commencer
l’implémentation avec une intelligence artificielle.

Le module ne construit pas directement l’application. Il organise la réflexion, révèle les décisions
manquantes et produit un plan suffisamment précis pour éviter que l’IA improvise le périmètre,
l’architecture ou les règles métier.

## 3. Problème traité

Lorsqu’un projet commence directement par la génération de code, plusieurs éléments essentiels
peuvent être oubliés :

- le problème réel à résoudre ;
- les utilisateurs concernés ;
- le périmètre du MVP ;
- les règles métier ;
- les scénarios d’échec ;
- les responsabilités des composants ;
- la sécurité ;
- la stratégie de test ;
- l’exploitation ;
- les critères permettant de déclarer une fonctionnalité terminée.

Ces omissions entraînent des réécritures, des incohérences, des failles et une dépendance excessive
aux décisions improvisées par l’IA.

## 4. Promesse

Transformer une idée de produit logiciel en un dossier de conception structuré, exploitable et
vérifiable, afin de commencer l’implémentation avec des frontières et des critères clairement
définis.

Le module doit aider l’utilisateur à comprendre et décider. Il ne doit pas remplacer automatiquement
les décisions du propriétaire du projet.

## 5. Public cible

- développeurs juniors et intermédiaires ;
- étudiants en développement logiciel ;
- freelances ;
- fondateurs techniques ;
- petites équipes ;
- porteurs de MVP utilisant une IA ;
- développeurs souhaitant mieux cadrer leurs projets avant le code.

## 6. Prérequis

L’utilisateur doit disposer :

- d’une idée de projet ou d’un problème identifié ;
- d’un accès à une IA capable de lire des instructions Markdown structurées ;
- d’un moyen de conserver les documents produits ;
- de la disponibilité nécessaire pour répondre aux questions de cadrage ;
- de l’autorité nécessaire pour prendre ou faire valider les décisions du projet.

Aucune stack technique ne doit être imposée avant l’analyse du besoin.

## 7. Résultat attendu

À la fin du parcours, l’utilisateur doit obtenir un dossier contenant au minimum :

- une définition du problème ;
- les utilisateurs et leurs rôles ;
- le périmètre MVP ;
- le hors périmètre ;
- les règles métier ;
- les scénarios principaux et d’échec ;
- un modèle de données conceptuel ;
- les frontières applicatives ;
- une architecture proposée et justifiée ;
- les risques principaux ;
- une base de sécurité ;
- une stratégie de test ;
- une stratégie d’exploitation initiale ;
- un backlog ordonné ;
- une Definition of Done ;
- les décisions confirmées ;
- les hypothèses ;
- les décisions encore ouvertes.

## 8. Périmètre

La première version distribuable envisagée (`1.x`) cible principalement :

- les applications web ;
- les MVP full-stack ;
- les applications monolithiques modulaires ;
- les interfaces publiques et privées ;
- les API associées ;
- les bases de données relationnelles ;
- l’authentification ;
- les déploiements simples ou conteneurisés ;
- les petites équipes.

## 9. Hors périmètre

La version initiale ne prétend pas concevoir complètement :

- les applications mobiles natives complexes ;
- les systèmes embarqués ;
- les systèmes temps réel critiques ;
- les architectures multi-régions ;
- les plateformes data ou machine learning spécialisées ;
- les systèmes distribués complexes ;
- les logiciels soumis à une certification réglementaire ;
- l’implémentation complète du code ;
- l’audit final de mise en production.

L’implémentation relève du module Promptube — Développeur méthodique. L’audit final relève du module
Promptube — Auditeur logiciel et Release Readiness.

## 10. Arborescence ZIP proposée

```text
promptube-architecte-projet-logiciel/
├── README.md
├── instructions/
│   ├── role-architect.md
│   └── interaction-contract.md
├── rules/
│   ├── scope-control.md
│   ├── architecture-boundaries.md
│   ├── security-baseline.md
│   └── decision-records.md
├── workflows/
│   ├── discovery.md
│   ├── domain-modeling.md
│   ├── architecture.md
│   └── delivery-plan.md
├── examples/
│   ├── simple-saas/
│   └── marketplace/
└── documentation/
    ├── glossary.md
    └── quality-checklist.md
```

Cette arborescence reste une proposition produit. Elle sera alignée sur le futur contrat commun des
paquets Promptube avant toute génération ou publication d’archive.

## 11. Règles centrales

Le module doit obliger l’IA à :

- comprendre avant de proposer ;
- distinguer les faits, décisions et hypothèses ;
- identifier les informations manquantes ;
- ne poser que les questions réellement utiles ;
- signaler les décisions ouvertes ;
- contrôler l’expansion du périmètre ;
- justifier les choix techniques ;
- éviter les outils obsolètes ;
- utiliser des sources actuelles lorsque l’information peut évoluer ;
- séparer les responsabilités ;
- intégrer sécurité, tests et exploitation dès la conception ;
- ne pas commencer prématurément l’implémentation ;
- ne pas présenter une hypothèse comme une décision validée.

## 12. Workflows prévus

### Découverte

Clarifier le problème, les utilisateurs, les objectifs, les contraintes et les indicateurs de
réussite.

### Modélisation du domaine

Identifier les acteurs, entités, états, transitions, invariants et scénarios d’échec.

### Architecture

Définir les frontières du système, les responsabilités, les flux, les données, la sécurité et les
décisions techniques.

### Plan de livraison

Produire le backlog, les priorités, les critères d’acceptation, la stratégie de test et la
Definition of Done.

Chaque workflow doit posséder une entrée, une sortie, des contrôles et une condition de fin
explicites.

## 13. Exemples prévus

### SaaS simple

Montrer comment cadrer une application web avec comptes utilisateurs, abonnement et espace privé.

### Marketplace

Montrer comment cadrer plusieurs rôles, un catalogue, des commandes, des paiements et des règles
métier plus complexes.

Les exemples doivent illustrer la méthode sans devenir des modèles universels à copier aveuglément.

## 14. Limites

- La qualité dépend de la précision des informations fournies par l’utilisateur.
- Le module ne garantit pas qu’une décision métier soit commercialement correcte.
- Il ne remplace pas un expert juridique, financier ou réglementaire.
- Il ne garantit pas la compatibilité parfaite avec toutes les IA.
- Il ne doit pas inventer des contraintes absentes.
- Il ne doit pas masquer les désaccords ou décisions non résolues.
- Il ne doit pas générer automatiquement un projet complet à partir d’informations insuffisantes.

## 15. Critères de qualité

Une utilisation est réussie lorsque :

- le problème est formulé clairement ;
- le MVP et le hors périmètre sont séparés ;
- les acteurs et responsabilités sont identifiés ;
- les règles métier sont testables ;
- les scénarios d’échec sont documentés ;
- les hypothèses sont visibles ;
- l’architecture répond aux besoins exprimés ;
- les choix importants sont justifiés ;
- la sécurité et les tests sont intégrés ;
- les décisions ouvertes sont listées ;
- le backlog est ordonné ;
- aucune implémentation prématurée n’a été introduite.

## 16. Compatibilité avec les IA

La compatibilité doit être évaluée selon les capacités de l’IA et non uniquement selon son nom
commercial.

L’IA utilisée doit pouvoir :

- lire plusieurs fichiers Markdown ;
- suivre des instructions hiérarchisées ;
- conserver un contexte de travail suffisant ;
- produire des réponses structurées ;
- distinguer instructions, données et exemples ;
- signaler ses incertitudes.

Chaque version publiée devra documenter les modèles et interfaces réellement testés. Aucune
compatibilité universelle ne doit être promise sans preuve.

## 17. Politique de mise à jour

Le module utilisera un versionnage sémantique :

- `PATCH` pour les corrections rédactionnelles sans changement de méthode ;
- `MINOR` pour les nouveaux exemples, contrôles ou workflows compatibles ;
- `MAJOR` pour une modification incompatible de la méthode ou de la structure.

Chaque version devra fournir :

- un changelog ;
- les changements importants ;
- les éventuelles incompatibilités ;
- une procédure de transition lorsque nécessaire ;
- la matrice de compatibilité testée.

## 18. Critères de test utilisateur

Le test initial doit vérifier si l’utilisateur :

- comprend la proposition du module ;
- sait commencer sans assistance externe ;
- termine le workflow de découverte ;
- distingue MVP et hors périmètre ;
- obtient des règles métier exploitables ;
- identifie des omissions qu’il n’avait pas vues ;
- juge les livrables suffisamment précis pour commencer le développement ;
- estime avoir gagné du temps ;
- souhaite réutiliser la méthode ;
- accepterait de payer pour le produit.

Les retours doivent relever les abandons, incompréhensions, étapes trop longues, résultats
inutilisables et demandes d’amélioration.

## 19. Décisions différées

Les éléments suivants seront validés après comparaison des trois fiches :

- prix ;
- licence commerciale ;
- durée d’accès aux mises à jour ;
- compatibilités officiellement garanties ;
- limites de téléchargement ;
- nom définitif de l’archive ;
- contrat commun du paquet ;
- manifeste versionné.
