# Bundle initial — Développement logiciel

## Métadonnées

- **Nom de travail :** Promptube — Concevoir, construire, vérifier
- **Version documentaire :** `0.1.0`
- **Statut :** `DRAFT`
- **Catégorie :** Développement logiciel
- **Sous-catégorie :** Ingénierie logicielle assistée par IA
- **Nombre de modules :** 3
- **Langue initiale :** français

## 1. Objectif du bundle

Ce bundle rassemble trois modules complémentaires destinés à encadrer le cycle de création d’un
projet logiciel avec une intelligence artificielle.

Il fournit une méthode continue :

1. concevoir le projet avant le code ;
2. construire le projet avec discipline ;
3. vérifier le projet avant sa livraison.

Le bundle ne remplace pas la responsabilité du propriétaire, du développeur ou de l’auditeur. Il
structure leur collaboration avec l’IA.

## 2. Modules inclus

### Promptube — Architecte de projet logiciel

- **Position :** avant l’implémentation
- **Rôle :** transformer une idée en plan logiciel exploitable
- **Fiche :** [architecte-projet-logiciel.md](architecte-projet-logiciel.md)

Ce module clarifie le problème, le périmètre, les règles métier, l’architecture, les risques, les
tests et le plan de livraison.

### Promptube — Développeur méthodique

- **Position :** pendant l’implémentation
- **Rôle :** encadrer les changements réalisés avec l’IA
- **Fiche :** [developpeur-methodique.md](developpeur-methodique.md)

Ce module impose l’inspection, le contrôle du périmètre, la sécurité, les tests, la discipline Git
et la production de preuves.

### Promptube — Auditeur logiciel et Release Readiness

- **Position :** après une implémentation significative et avant la production
- **Rôle :** déterminer si le projet est prêt à être livré
- **Fiche :** [auditeur-release-readiness.md](auditeur-release-readiness.md)

Ce module collecte des preuves, classe les risques, vérifie les mécanismes critiques et produit un
verdict défensif de préparation à la livraison.

## 3. Parcours principal

```text
Idée de projet
      ↓
Architecte de projet logiciel
      ↓
Dossier de conception validé
      ↓
Développeur méthodique
      ↓
Implémentation contrôlée
      ↓
Auditeur logiciel et Release Readiness
      ↓
READY | READY_WITH_ACCEPTED_RISKS | NOT_READY
```

Le verdict `READY_WITH_ACCEPTED_RISKS` ne signifie pas que l’Auditeur accepte lui-même les risques.
Il n’est valable que lorsque le propriétaire ou une personne autorisée a explicitement accepté les
risques résiduels concernés.

## 4. Utilisation indépendante

Chaque module doit rester utilisable séparément.

- l’Architecte peut être utilisé pour cadrer un projet qui sera ensuite développé sans le module
  Développeur ;
- le Développeur peut partir d’un dossier de conception existant produit par une autre méthode ;
- l’Auditeur peut examiner un projet sans exiger l’utilisation préalable des deux autres modules.

Le bundle apporte une continuité supplémentaire, mais ne doit pas créer une dépendance artificielle
entre les produits.

## 5. Public cible commun

Le bundle s’adresse principalement :

- aux développeurs juniors et intermédiaires ;
- aux étudiants en développement logiciel ;
- aux freelances ;
- aux fondateurs techniques ;
- aux petites équipes ;
- aux porteurs de MVP ;
- aux utilisateurs souhaitant travailler avec une IA sans lui abandonner les décisions du projet.

## 6. Valeur commune

Les trois modules doivent aider l’utilisateur à :

- réduire les omissions ;
- limiter les décisions improvisées par l’IA ;
- rendre les choix visibles ;
- contrôler le périmètre ;
- conserver des preuves ;
- améliorer la sécurité et la qualité ;
- produire un résultat compréhensible et vérifiable ;
- rester responsable des décisions finales.

## 7. Principes communs

Tous les modules du bundle doivent appliquer les principes suivants :

- inspection avant action ;
- décisions explicites ;
- séparation entre faits, hypothèses et recommandations ;
- changements limités au périmètre autorisé ;
- protection des secrets et des données personnelles ;
- refus des opérations destructives non validées ;
- tests adaptés au niveau de risque ;
- traçabilité des décisions ;
- signalement honnête des incertitudes ;
- absence de résultats ou de preuves inventés.

## 8. Frontières entre les modules

### Architecte de projet logiciel

Il définit ce qui doit être construit et pourquoi.

Il ne doit pas :

- implémenter entièrement l’application ;
- déclarer le projet prêt pour la production ;
- remplacer les décisions du propriétaire.

### Développeur méthodique

Il encadre la manière de construire et de modifier le logiciel.

Il ne doit pas :

- redéfinir silencieusement le produit ;
- élargir le périmètre sans validation ;
- prononcer seul le verdict final de mise en production.

### Auditeur logiciel et Release Readiness

Il vérifie les preuves et évalue la préparation à la livraison.

Il ne doit pas :

- modifier le projet sans autorisation ;
- effectuer des actions destructives ;
- masquer un risque pour obtenir un verdict favorable ;
- garantir une absence absolue de défauts.

## 9. Résultat attendu du parcours complet

Lorsque les trois modules sont utilisés successivement, l’utilisateur doit obtenir :

1. un dossier de conception validé ;
2. une implémentation réalisée selon un périmètre contrôlé ;
3. des tests et preuves associés aux changements ;
4. un registre des risques connus ;
5. un rapport d’audit ;
6. un verdict explicite de préparation à la livraison ;
7. une liste des actions restantes lorsque le projet n’est pas prêt.

## 10. Cohérence documentaire

Les trois fiches produit doivent respecter le [contrat documentaire commun](../README.md).

Chaque fiche reste la source de vérité de son propre module. Le présent document décrit uniquement
leur articulation dans le bundle.

Une modification apportée à un module doit être vérifiée par rapport :

- à sa promesse ;
- à ses frontières ;
- aux deux autres modules ;
- au parcours complet ;
- au contrat documentaire commun.

## 11. Validation utilisateur du bundle

Avant toute publication commerciale, le bundle doit être évalué sur au moins un projet
représentatif.

La validation doit vérifier :

- que l’ordre des modules est compréhensible ;
- que chaque module peut être utilisé indépendamment ;
- que les livrables d’un module sont exploitables par le suivant ;
- que les questions posées ne sont pas inutilement répétitives ;
- que les responsabilités restent claires ;
- que le parcours produit des décisions et preuves utiles ;
- que la charge de travail reste acceptable pour le public cible.

## 12. Décisions commerciales différées

Les décisions suivantes ne sont pas encore validées :

- vente séparée ou groupée des modules ;
- prix de chaque module ;
- prix du bundle ;
- politique de licence ;
- durée d’accès ;
- fréquence des mises à jour ;
- support inclus ;
- modèles d’IA officiellement testés ;
- conditions de remboursement ;
- nom commercial définitif du bundle.

Ces décisions ne doivent pas être intégrées silencieusement aux fiches produit.

## 13. Limites de la phase actuelle

La phase actuelle formalise uniquement le positionnement et la cohérence des trois produits.

Elle ne crée pas encore :

- les dossiers complets des modules ;
- les fichiers d’instructions définitifs ;
- les exemples exécutables ;
- le manifeste versionné ;
- les archives ZIP ;
- le système de validation des archives ;
- le stockage privé ;
- la publication ;
- la vente ou le téléchargement.

Après approbation des fiches, chaque véritable module sera construit manuellement dans un dossier
séparé, validé, compressé en archive ZIP privée, puis importé depuis l’interface d’administration
dans la catégorie, la sous-catégorie, le module et la version correspondants.

Ce document décrit ce futur parcours sans l’implémenter.
