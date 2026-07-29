# Fiche produit — Promptube Auditeur logiciel et Release Readiness

## Métadonnées

- **Identifiant provisoire :** `promptube-software-auditor`
- **Version de la fiche :** `0.1.0`
- **Statut :** `IN_REVIEW`
- **Catégorie :** Développement logiciel
- **Sous-catégorie :** Ingénierie logicielle assistée par IA
- **Position dans le cycle :** après une implémentation significative et avant la production
- **Langue initiale :** français
- **Format prévu :** archive ZIP privée composée principalement de fichiers Markdown
- **Orientation :** audit défensif de systèmes autorisés

## 1. Nom commercial

**Promptube — Auditeur logiciel et Release Readiness**

Ce nom est retenu pour la version de travail `0.1.0`. Il devra être validé avec l’ensemble des trois
fiches avant le passage au statut `APPROVED`.

## 2. Résumé

Promptube — Auditeur logiciel et Release Readiness est un module professionnel qui encadre
l’utilisation d’une intelligence artificielle pour examiner un projet logiciel avant sa livraison ou
sa mise en production.

Il demande à l’IA de rechercher des preuves, de classer les constats, d’identifier les risques, de
vérifier les mécanismes de sécurité et d’exploitation, puis de produire un verdict explicite sur
l’état de préparation du projet.

Le module ne cherche pas à prouver qu’un projet est prêt à tout prix. Il doit pouvoir conclure
qu’une livraison est bloquée lorsque les preuves sont insuffisantes ou qu’un risque inacceptable
subsiste.

## 3. Problème traité

Un projet peut compiler et réussir certains tests tout en contenant :

- des erreurs d’autorisation ;
- des validations insuffisantes ;
- des secrets exposés ;
- des dépendances vulnérables ;
- des migrations dangereuses ;
- des sauvegardes non restaurables ;
- un rollback inexistant ;
- des images Docker trop lourdes ou vulnérables ;
- des ports ou services inutilement exposés ;
- des journaux contenant des données sensibles ;
- des erreurs de concurrence ;
- des contrôles de sécurité désactivés ;
- une couverture de tests insuffisante ;
- une observabilité incomplète ;
- des contradictions entre le code et la documentation ;
- des procédures de déploiement non vérifiées.

Sans méthode d’audit, ces problèmes peuvent être ignorés ou signalés sans preuve, sans priorité et
sans plan de correction.

## 4. Promesse

Transformer l’IA en auditeur défensif chargé de déterminer, avec des preuves vérifiables, si un
projet est prêt ou non à être livré.

Le module doit produire des constats hiérarchisés, expliquer leurs conséquences, proposer un plan de
correction et vérifier les remédiations sans masquer les risques résiduels.

## 5. Public cible

- développeurs juniors, intermédiaires et seniors ;
- freelances ;
- fondateurs techniques ;
- petites équipes ;
- responsables de livraison ;
- mainteneurs de projets ;
- personnes préparant un MVP à la production ;
- utilisateurs du module Promptube — Développeur méthodique ;
- équipes souhaitant structurer une revue avant déploiement.

## 6. Prérequis

L’utilisateur doit disposer :

- de l’autorisation explicite d’auditer le système concerné ;
- d’un périmètre d’audit défini ;
- d’un dépôt ou artefact identifiable ;
- des règles et documentations disponibles ;
- d’un environnement permettant les contrôles autorisés ;
- des résultats de tests existants lorsqu’ils sont disponibles ;
- d’un inventaire des composants et dépendances ;
- d’informations sur le déploiement prévu ;
- d’un moyen de protéger les secrets et données sensibles ;
- d’une personne capable de valider les risques et décisions finales.

Les contrôles ne doivent être exécutés que sur des systèmes, données et environnements explicitement
autorisés.

## 7. Résultat attendu

À la fin du parcours, l’utilisateur doit obtenir :

- un inventaire du périmètre audité ;
- les hypothèses et limites de l’audit ;
- un modèle de menace simplifié ;
- les contrôles exécutés ;
- les preuves collectées ;
- les constats classés par sévérité ;
- les composants concernés ;
- l’impact de chaque constat ;
- les recommandations de correction ;
- les contrôles de non-régression ;
- les risques acceptés ou différés ;
- une analyse des sauvegardes et du rollback ;
- une matrice de préparation à la livraison ;
- un verdict `READY`, `READY_WITH_ACCEPTED_RISKS` ou `NOT_READY` ;
- un rapport final vérifiable.

L’absence de preuve doit être présentée comme une limite ou un blocage, jamais comme une réussite
implicite.

Le verdict `READY_WITH_ACCEPTED_RISKS` ne peut être utilisé que si chaque risque résiduel concerné a
été explicitement accepté par le propriétaire ou par une personne autorisée, avec une justification
et un responsable identifiés. L’auditeur ne peut jamais accepter un risque à leur place.

## 8. Périmètre

La première version distribuable envisagée (`1.x`) cible principalement :

- les applications web ;
- les MVP full-stack ;
- les API ;
- les dépôts Git ;
- les bases de données relationnelles ;
- les migrations ;
- l’authentification et les sessions ;
- les autorisations ;
- les dépendances ;
- les applications conteneurisées ;
- les configurations Docker et réseau ;
- les sauvegardes et restaurations ;
- les tests ;
- les logs et métriques ;
- la documentation de déploiement ;
- les procédures de rollback.

## 9. Hors périmètre

La version initiale ne doit pas :

- conduire une attaque réelle non autorisée ;
- exploiter un système tiers ;
- faciliter la persistance ou l’exfiltration ;
- voler des identifiants ou contourner une authentification ;
- détruire ou altérer des données ;
- lancer un test de charge sans autorisation ;
- effectuer un scan externe agressif ;
- modifier automatiquement la production ;
- accepter un risque au nom du propriétaire ;
- garantir l’absence totale de vulnérabilité ;
- remplacer un audit réglementaire ou une certification ;
- déclarer un projet prêt sans preuves suffisantes ;
- corriger silencieusement le code pendant la phase de constat.

La conception relève du module Promptube — Architecte de projet logiciel. L’implémentation et les
corrections relèvent du module Promptube — Développeur méthodique.

## 10. Arborescence ZIP proposée

```text
promptube-auditeur-release-readiness/
├── README.md
├── instructions/
│   ├── role-defensive-auditor.md
│   └── evidence-policy.md
├── rules/
│   ├── authorization-only.md
│   ├── no-secret-exposure.md
│   ├── no-destructive-action.md
│   └── severity-model.md
├── workflows/
│   ├── application-audit.md
│   ├── database-audit.md
│   ├── docker-audit.md
│   ├── release-readiness.md
│   └── remediation-verification.md
├── examples/
│   ├── audit-report/
│   ├── risk-register/
│   └── rollback-plan/
└── documentation/
    ├── severity-guide.md
    ├── evidence-template.md
    └── final-verdict-template.md
```

Cette arborescence reste une proposition produit. Elle sera alignée sur le futur contrat commun des
paquets Promptube avant toute génération ou publication d’archive.

## 11. Règles centrales

Le module doit obliger l’IA à :

- confirmer l’autorisation et le périmètre avant tout contrôle ;
- commencer par une inspection non modificative ;
- distinguer les faits, preuves, hypothèses et recommandations ;
- ne jamais inventer le résultat d’un contrôle ;
- associer chaque constat à une preuve reproductible ;
- protéger les secrets et données sensibles ;
- minimiser les informations collectées ;
- ne pas exécuter d’action destructive ;
- ne pas exploiter une vulnérabilité au-delà de la preuve strictement nécessaire et autorisée ;
- séparer la phase de constat de la phase de correction ;
- utiliser une classification de sévérité cohérente ;
- expliquer l’impact et les conditions d’exploitation ;
- signaler les limites de couverture ;
- consulter les documentations officielles actuelles ;
- vérifier les sauvegardes par une restauration contrôlée ;
- vérifier l’existence d’un rollback ;
- refuser un verdict positif lorsque les preuves sont insuffisantes ;
- conserver les risques résiduels dans le rapport final.

Un constat ne doit pas être classé uniquement selon son apparence technique. La sévérité doit tenir
compte de l’impact, de l’exposition, de la probabilité, des protections existantes et du contexte
métier.

## 12. Workflows prévus

### Audit applicatif

Examiner l’architecture, les entrées, les erreurs, l’authentification, les autorisations, les
sessions, les secrets, les dépendances, les tests et la documentation.

### Audit de base de données

Examiner les rôles, permissions, migrations, contraintes, transactions, sauvegardes, restaurations,
données sensibles et procédures de rollback.

### Audit Docker et infrastructure locale

Examiner les images, versions, utilisateurs, capabilities, systèmes de fichiers, secrets, ports,
réseaux, volumes, healthchecks et frontières entre services.

### Release Readiness

Consolider les preuves, vérifier les critères de livraison, classer les blocages, documenter les
risques acceptés et produire le verdict final.

### Vérification des remédiations

Reproduire le constat initial, vérifier la correction, exécuter les contrôles de non-régression et
confirmer si le risque est supprimé, réduit, accepté ou toujours présent.

Chaque workflow doit définir :

- son autorisation ;
- son périmètre ;
- ses préconditions ;
- ses contrôles ;
- ses preuves ;
- son modèle de sévérité ;
- sa condition d’arrêt ;
- ses limites ;
- son verdict.

## 13. Exemples prévus

### Rapport d’audit

Présenter des constats structurés avec identifiant, sévérité, preuve, impact, recommandation et état
de remédiation.

### Registre des risques

Montrer comment conserver les risques ouverts, acceptés, différés ou corrigés avec leur responsable
et leur échéance.

### Plan de rollback

Décrire une procédure de retour arrière vérifiable pour une livraison contenant une application, une
migration ou une modification d’infrastructure.

Les exemples doivent rester défensifs, utiliser des systèmes fictifs ou autorisés et ne contenir
aucun secret réel.

## 14. Limites

- L’audit est limité aux éléments réellement accessibles.
- L’absence de constat ne garantit pas l’absence de vulnérabilité.
- Une preuve manquante réduit la confiance du verdict.
- Le module ne remplace pas un audit réglementaire.
- Il ne garantit pas la conformité à une norme non explicitement évaluée.
- Il ne doit pas conduire d’exploitation réelle non autorisée.
- Il ne doit pas modifier la production pendant la phase de constat.
- Il ne peut pas valider une sauvegarde sans restauration contrôlée.
- Il ne peut pas valider un rollback qui n’a jamais été vérifié.
- Il ne doit pas accepter un risque au nom du propriétaire.
- Il ne doit pas déclarer un système prêt uniquement parce que le build réussit.
- Il ne doit pas masquer les dettes connues pour produire un verdict positif.

## 15. Critères de qualité

Un audit est réussi lorsque :

- l’autorisation est confirmée ;
- le périmètre est explicite ;
- l’inventaire est complet pour la zone examinée ;
- les contrôles sont reproductibles ;
- les preuves sont suffisantes et non sensibles ;
- les constats sont classés de manière cohérente ;
- les faux positifs sont distingués des risques confirmés ;
- les impacts sont expliqués ;
- les recommandations sont réalisables ;
- les blocages de livraison sont visibles ;
- les sauvegardes et restaurations sont évaluées ;
- le rollback est évalué ;
- les limites de l’audit sont documentées ;
- les risques acceptés possèdent une justification et un responsable ;
- les remédiations disposent de contrôles de non-régression ;
- le verdict correspond aux preuves disponibles.

## 16. Compatibilité avec les IA

La compatibilité doit être évaluée selon les capacités réelles de l’IA et de l’environnement.

L’IA doit pouvoir :

- lire plusieurs fichiers ;
- analyser des configurations et des diffs ;
- interpréter des résultats de tests et de scans ;
- structurer des preuves ;
- classifier des constats ;
- distinguer observation et recommandation ;
- protéger les informations sensibles ;
- signaler ses incertitudes ;
- refuser les opérations non autorisées.

L’accès au terminal, aux scanners ou aux plateformes de CI reste optionnel. Lorsque l’IA ne possède
pas ces accès, elle doit fournir des commandes contrôlées que l’utilisateur exécute lui-même, puis
analyser les résultats transmis.

Chaque version publiée devra préciser les modèles, outils, formats de rapport et environnements
réellement testés.

## 17. Politique de mise à jour

Le module utilisera un versionnage sémantique :

- `PATCH` pour les corrections rédactionnelles ou les précisions sans changement de méthode ;
- `MINOR` pour les nouveaux contrôles, domaines d’audit, outils ou exemples compatibles ;
- `MAJOR` pour une modification incompatible du modèle de sévérité, des règles de preuve ou du
  verdict.

Chaque mise à jour devra documenter :

- les contrôles ajoutés ou retirés ;
- les outils et versions testés ;
- les règles de sévérité modifiées ;
- les formats de preuve modifiés ;
- les incompatibilités ;
- les pratiques devenues obsolètes ;
- les limites de couverture connues.

Les contrôles dépendant d’un outil, d’une norme ou d’une technologie doivent être réévalués lorsque
leurs versions évoluent.

## 18. Critères de test utilisateur

Le test initial doit vérifier si l’utilisateur :

- comprend la différence entre audit et correction ;
- sait définir un périmètre autorisé ;
- obtient un inventaire exploitable ;
- comprend la sévérité des constats ;
- peut reproduire les preuves ;
- distingue blocage, dette et recommandation ;
- identifie des risques auparavant ignorés ;
- comprend le verdict final ;
- sait prioriser les corrections ;
- peut vérifier une remédiation ;
- estime que le rapport facilite une décision de livraison ;
- souhaite réutiliser la méthode ;
- accepterait de payer pour le produit.

Les tests doivent relever les contrôles ambigus, les faux positifs, les preuves insuffisantes, les
rapports trop longs et les situations où le verdict n’aide pas à prendre une décision.

## 19. Décisions différées

Les éléments suivants seront validés après comparaison des trois fiches :

- prix ;
- licence commerciale ;
- durée d’accès aux mises à jour ;
- compatibilités officiellement garanties ;
- outils de scan officiellement pris en charge ;
- modèle définitif de sévérité ;
- format final du registre des risques ;
- format du verdict de livraison ;
- contrat commun du paquet ;
- manifeste versionné.
