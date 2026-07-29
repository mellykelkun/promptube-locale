# Contrat documentaire des produits Promptube

## Métadonnées

- **Version du contrat :** `0.1.0`
- **Statut :** `DRAFT`
- **Portée :** fiches produit Promptube
- **Langue initiale :** français
- **Catégorie initiale :** Développement logiciel
- **Sous-catégorie initiale :** Ingénierie logicielle assistée par IA

## 1. Objectif

Ce document définit la structure commune des fiches produit Promptube.

Son objectif est de garantir que chaque module possède une identité, une promesse, un périmètre, des
règles, des workflows, des limites et des critères de validation suffisamment précis avant la
conception du paquet ZIP ou l’implémentation du stockage.

Une fiche produit décrit le produit attendu. Elle n’est pas encore le produit distribuable.

## 2. Position dans le cycle de conception

L’ordre de travail obligatoire est :

1. définir la fiche produit ;
2. comparer et valider les fiches d’un même bundle ;
3. définir le contrat commun du paquet ;
4. définir le manifeste versionné ;
5. sécuriser le Markdown ;
6. choisir et sécuriser le stockage ;
7. construire le pipeline d’artefacts ;
8. tester le produit réel ;
9. publier.

Ce contrat couvre uniquement les deux premières étapes.

## 3. Hiérarchie produit

Promptube organise ses produits selon cette hiérarchie :

- une catégorie contient des sous-catégories ;
- une sous-catégorie contient des modules ;
- un module possède une identité stable ;
- un module possède une ou plusieurs versions ;
- une version pourra être associée à une archive distribuable après validation du futur contrat de
  paquet.

Une fiche produit décrit le module stable et les attentes de sa première version.

## 4. Métadonnées obligatoires

Chaque fiche doit commencer par les informations suivantes :

- identifiant provisoire ou définitif ;
- version de la fiche ;
- statut documentaire ;
- catégorie ;
- sous-catégorie ;
- position dans le cycle de travail ;
- langue initiale ;
- format de distribution prévu ;
- orientation ou restriction particulière lorsqu’elle existe.

L’identifiant doit être stable, lisible, sans espace et distinct des noms commerciaux susceptibles
d’évoluer.

## 5. Sections obligatoires

Chaque fiche produit doit contenir les sections suivantes dans cet ordre :

1. nom commercial ;
2. résumé ;
3. problème traité ;
4. promesse ;
5. public cible ;
6. prérequis ;
7. résultat attendu ;
8. périmètre ;
9. hors périmètre ;
10. arborescence ZIP proposée ;
11. règles centrales ;
12. workflows prévus ;
13. exemples prévus ;
14. limites ;
15. critères de qualité ;
16. compatibilité avec les IA ;
17. politique de mise à jour ;
18. critères de test utilisateur ;
19. décisions différées.

Une section ne doit pas être supprimée parce qu’elle semble inutile. Lorsqu’elle n’est réellement
pas applicable, la fiche doit l’indiquer et le justifier.

## 6. Exigences rédactionnelles

Une fiche doit :

- utiliser un langage précis ;
- distinguer les capacités promises des capacités envisagées ;
- éviter les promesses impossibles à vérifier ;
- séparer le périmètre du hors périmètre ;
- rendre les limites visibles ;
- éviter de présenter une hypothèse comme une décision ;
- identifier les décisions encore ouvertes ;
- rester indépendante d’un fournisseur d’IA lorsque cela est possible ;
- ne pas imposer une stack sans justification ;
- ne contenir aucun secret ;
- ne pas contenir de donnée personnelle réelle ;
- ne pas présenter une arborescence proposée comme un contrat déjà validé.

## 7. Statuts documentaires

Les fiches suivent le cycle suivant :

`DRAFT → IN_REVIEW → APPROVED → SUPERSEDED`

### DRAFT

La fiche est en cours de rédaction. Son nom, son périmètre et son contenu peuvent encore évoluer.

### IN_REVIEW

La fiche est complète et soumise à une revue produit, technique et commerciale.

### APPROVED

Le propriétaire a validé la fiche comme base de conception du produit.

`APPROVED` ne signifie pas que le module est publié, vendu ou techniquement distribuable.

### SUPERSEDED

Une nouvelle version approuvée remplace cette fiche. L’ancienne version reste conservée pour
l’historique.

## 8. Versionnage

Les fiches utilisent un versionnage sémantique :

- `PATCH` pour une correction rédactionnelle sans changement de promesse ou de périmètre ;
- `MINOR` pour une extension compatible du produit ;
- `MAJOR` pour une modification incompatible de la promesse, du périmètre ou du contrat produit.

Une version approuvée ne doit pas être modifiée silencieusement. Toute évolution doit créer une
nouvelle version identifiable.

## 9. Critères de passage en revue

Une fiche peut passer de `DRAFT` à `IN_REVIEW` lorsque :

- les 19 sections sont présentes ;
- le problème est compréhensible ;
- la promesse répond au problème ;
- le public cible est identifiable ;
- le résultat attendu est vérifiable ;
- le périmètre et le hors périmètre sont cohérents ;
- les règles et workflows correspondent à la promesse ;
- les limites sont explicites ;
- les critères de qualité sont testables ;
- la compatibilité IA ne contient pas de promesse non prouvée ;
- les décisions ouvertes sont visibles ;
- la fiche est formatée et versionnée.

## 10. Critères d’approbation

Une fiche peut passer à `APPROVED` lorsque :

- le propriétaire valide son nom et son positionnement ;
- les contradictions détectées ont été résolues ;
- son rôle par rapport aux autres modules est clair ;
- les chevauchements inutiles ont été supprimés ;
- les tests utilisateurs prévus permettent d’évaluer la valeur réelle ;
- les risques commerciaux et techniques connus sont documentés ;
- la fiche peut servir de source à la conception du paquet sans interprétation majeure.

## 11. Relation entre les fiches et les paquets

Les arborescences ZIP présentes dans les fiches sont des propositions produit.

Elles ne définissent pas encore :

- le manifeste `promptube-module.json` ;
- le schéma de validation ;
- les checksums ;
- les tailles maximales ;
- les types de fichiers autorisés ;
- les règles de liens et chemins ;
- le rendu Markdown sécurisé ;
- le stockage ;
- l’analyse antimalware ;
- la signature ;
- la publication ;
- le téléchargement.

Ces responsabilités appartiennent aux phases suivantes.

## 12. Compatibilité avec les IA

Aucune fiche ne doit promettre une compatibilité universelle.

La compatibilité doit être fondée sur :

- les capacités nécessaires ;
- les modèles réellement testés ;
- les interfaces utilisées ;
- la taille du contexte ;
- la prise en charge de plusieurs fichiers ;
- la capacité à respecter des instructions hiérarchisées ;
- les limites observées ;
- la date du test.

Les noms de modèles et versions testés seront documentés au niveau des versions distribuables.

## 13. Sécurité et éthique

Toutes les fiches doivent respecter les principes suivants :

- travail uniquement sur des systèmes autorisés ;
- protection des secrets et données personnelles ;
- refus des opérations destructives non validées ;
- signalement des incertitudes ;
- absence de résultats ou preuves inventés ;
- séparation entre constat, décision et action ;
- responsabilité finale conservée par l’utilisateur ;
- limites réglementaires et professionnelles clairement signalées.

## 14. Bundle initial

Le premier bundle Promptube couvre le cycle logiciel suivant :

1. concevoir avec Promptube — Architecte de projet logiciel ;
2. construire avec Promptube — Développeur méthodique ;
3. vérifier avec Promptube — Auditeur logiciel et Release Readiness.

Fiches actuelles :

- `developpement-logiciel/architecte-projet-logiciel.md` ;
- `developpement-logiciel/developpeur-methodique.md` ;
- `developpement-logiciel/auditeur-release-readiness.md`.

Les trois modules doivent rester utilisables séparément. Leur combinaison forme un parcours cohérent
de conception, d’implémentation et de vérification.

## 15. Hors périmètre de ce contrat

Ce document n’autorise aucune :

- migration ;
- modification de base de données ;
- génération de ZIP ;
- création de manifeste ;
- activation du stockage objet ;
- publication vers la production ;
- intégration de paiement ;
- création de compte client ;
- distribution commerciale.

Il formalise uniquement les produits avant leur implémentation technique.
