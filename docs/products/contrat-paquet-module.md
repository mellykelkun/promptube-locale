# Contrat technique des paquets de modules Promptube

## Métadonnées

- **Version du contrat :** `0.1.0`
- **Statut :** `DRAFT`
- **Portée :** paquets distribuables des modules Promptube
- **Format initial :** archive ZIP privée
- **Contenu initial :** fichiers Markdown et manifeste JSON
- **Encodage textuel :** UTF-8
- **Algorithme d’intégrité :** SHA-256

## 1. Objectif

Ce document définit le contrat technique commun que devra respecter tout paquet de module Promptube
avant son import, sa validation, son stockage ou sa publication.

Il transforme les arborescences proposées dans les fiches produit en règles techniques vérifiables.

Un paquet conforme à ce contrat n’est pas automatiquement approuvé, publié, vendu ou sûr pour la
production. Il devient uniquement admissible aux étapes de validation suivantes.

## 2. Définitions

### Module

Produit Promptube possédant une identité stable, une promesse et un périmètre définis dans une fiche
produit approuvée.

### Version

Édition immuable et identifiable d’un module.

### Dossier source

Dossier construit manuellement contenant les fichiers du module avant compression.

### Paquet

Ensemble structuré des fichiers constituant une version distribuable.

### Archive

Fichier ZIP produit à partir d’un paquet conforme.

### Manifeste

Fichier `promptube-module.json` décrivant l’identité, la version, la structure et l’intégrité du
paquet.

### Validation

Suite de contrôles qui accepte ou refuse un paquet sans exécuter son contenu.

## 3. Relation avec les fiches produit

La fiche produit approuvée définit :

- la promesse du module ;
- son public cible ;
- son périmètre ;
- ses règles ;
- ses workflows ;
- ses limites ;
- ses critères de qualité.

Le présent contrat définit :

- la structure technique du dossier ;
- les noms autorisés ;
- les formats acceptés ;
- les limites de sécurité ;
- les contrôles d’intégrité ;
- les conditions minimales de validation.

Le paquet ne doit pas étendre silencieusement la promesse ou le périmètre de la fiche produit
approuvée.

## 4. Principes obligatoires

Tout paquet doit respecter les principes suivants :

- une seule racine logique ;
- une identité et une version explicites ;
- aucun secret ;
- aucune donnée personnelle réelle ;
- aucun contenu exécutable ;
- aucun chemin sortant de la racine ;
- aucun lien symbolique ou fichier spécial ;
- aucune dépendance à un accès public permanent ;
- aucune validation fondée uniquement sur l’extension du fichier ;
- aucune publication avant validation complète ;
- aucune modification silencieuse d’une version publiée ;
- aucune exécution pendant l’inspection ou la validation.

## 5. Structure de référence

```text
promptube-<module-slug>/
├── promptube-module.json
├── README.md
├── instructions/
│   └── *.md
├── rules/
│   └── *.md
├── workflows/
│   └── *.md
├── examples/
│   └── **/*.md
└── documentation/
    └── **/*.md
```

La racine contient obligatoirement :

- `promptube-module.json` ;
- `README.md` ;
- `instructions/` ;
- `rules/` ;
- `workflows/`.

Les dossiers suivants sont facultatifs :

- `examples/` ;
- `documentation/`.

Chaque dossier obligatoire doit contenir au moins un fichier Markdown non vide.

Aucun autre fichier ou dossier de premier niveau n’est autorisé dans la version initiale du contrat.

## 6. Identité et nommage

Le slug du module doit :

- utiliser uniquement les lettres minuscules ASCII, les chiffres et le tiret ;
- commencer et finir par une lettre ou un chiffre ;
- ne pas contenir deux tirets successifs ;
- rester stable entre les versions ;
- contenir au maximum 64 caractères.

Expression de référence :

```text
[a-z0-9]+(?:-[a-z0-9]+)*
```

Les noms de dossiers internes doivent respecter la même expression.

Les fichiers Markdown doivent suivre le format `<fichier-slug>.md`. `README.md` constitue l’unique
exception utilisant des majuscules.

Le dossier racine suit le format :

```text
promptube-<module-slug>/
```

Le nom de l’archive suit provisoirement le format :

```text
promptube-<module-slug>-<version-semver>.zip
```

Exemple :

```text
promptube-architecte-projet-logiciel-1.0.0.zip
```

Le slug et la version du nom de l’archive devront correspondre aux valeurs du manifeste.

## 7. Règles applicables aux chemins

Tous les chemins internes doivent :

- être relatifs à la racine unique ;
- utiliser `/` comme séparateur ;
- être encodés en UTF-8 valide ;
- utiliser des noms ASCII sans espace ;
- éviter toute ambiguïté entre majuscules et minuscules ;
- rester uniques après normalisation ;
- respecter les limites de longueur définies par le contrat.

Sont interdits :

- les chemins absolus ;
- les segments `.` et `..` ;
- les antislashs `\` ;
- les octets nuls ;
- les caractères de contrôle ;
- les noms terminés par un point ou un espace ;
- les chemins répétés ;
- les chemins différents uniquement par la casse ;
- les chemins vers un répertoire parent ;
- les chemins commençant par `/`, `~` ou une lettre de lecteur ;
- les noms réservés `CON`, `PRN`, `AUX`, `NUL`, `COM1` à `COM9` et `LPT1` à `LPT9`, sans distinction
  de casse ;
- les fichiers ou dossiers cachés.

La validation doit normaliser et contrôler les chemins avant toute extraction.

## 8. Fichiers autorisés

La version initiale autorise uniquement :

- les fichiers Markdown portant l’extension `.md` ;
- le manifeste racine `promptube-module.json`.

Les exemples de code doivent être placés dans des blocs de code Markdown. Aucun fichier source
exécutable ou interprétable n’est autorisé dans cette première version.

L’ajout futur d’images, de fichiers texte, de schémas, de code source ou d’autres formats exigera
une nouvelle version du contrat et des contrôles adaptés.

## 9. Fichiers et contenus interdits

Sont notamment interdits :

- les exécutables ;
- les scripts ;
- les bibliothèques binaires ;
- les archives imbriquées ;
- les images dans la version initiale ;
- les documents bureautiques ;
- les fichiers audio ou vidéo ;
- les fichiers chiffrés ;
- les fichiers protégés par mot de passe ;
- les liens symboliques ;
- les liens physiques ;
- les sockets ;
- les périphériques ;
- les tubes nommés ;
- les fichiers temporaires d’éditeur ;
- les fichiers de sauvegarde locale ;
- les métadonnées de système d’exploitation ;
- les dossiers `.git` ;
- les dossiers `node_modules` ;
- les fichiers `.env` ;
- les clés privées ;
- les certificats privés ;
- les secrets ou identifiants réels.

Exemples explicitement refusés :

```text
.DS_Store
__MACOSX/
.git/
.env
*.swp
*.tmp
*.bak
node_modules/
```

## 10. Limites provisoires

Les limites suivantes sont des valeurs initiales à confirmer par des tests représentatifs avant le
passage du contrat à `APPROVED`.

| Élément                                  | Limite provisoire |
| ---------------------------------------- | ----------------- |
| Taille compressée de l’archive           | 10 Mio            |
| Taille totale après décompression        | 25 Mio            |
| Taille d’un fichier                      | 1 Mio             |
| Nombre total de fichiers                 | 200               |
| Profondeur maximale des dossiers         | 8 niveaux         |
| Longueur maximale d’un chemin            | 240 octets        |
| Longueur maximale d’un segment de chemin | 80 caractères     |
| Ratio global de décompression            | 100:1             |
| Ratio de décompression d’un fichier      | 100:1             |

Une archive dépassant une seule limite doit être rejetée pendant la validation.

Les limites doivent être appliquées pendant l’inspection et pendant l’extraction. Elles ne doivent
pas dépendre uniquement des valeurs déclarées par l’archive.

## 11. Sécurité de l’archive ZIP

Une archive valide doit :

- contenir exactement une racine logique ;
- utiliser uniquement les méthodes de compression autorisées ;
- ne pas être chiffrée ;
- ne pas être multi-volume ;
- ne contenir aucune archive imbriquée ;
- ne contenir aucun lien ou fichier spécial ;
- ne contenir aucun chemin dangereux ;
- respecter les limites compressées et décompressées ;
- être inspectée avant extraction ;
- être extraite uniquement dans un répertoire temporaire isolé ;
- ne jamais être extraite directement dans le stockage définitif ;
- ne jamais provoquer l’exécution d’un fichier.

Les méthodes de compression initialement envisagées sont :

- stockage sans compression ;
- Deflate.

Toute autre méthode doit être refusée jusqu’à validation explicite.

## 12. Protection contre les ZIP bombs

La validation doit contrôler au minimum :

- la taille compressée ;
- la taille décompressée annoncée ;
- la taille réellement extraite ;
- le nombre d’entrées ;
- le ratio de compression ;
- la profondeur des dossiers ;
- la récursion par archives imbriquées ;
- les entrées dupliquées ;
- l’évolution cumulée des tailles pendant l’extraction.

L’extraction doit s’arrêter immédiatement lorsqu’une limite est dépassée.

Un échec doit supprimer le répertoire temporaire sans conserver d’extrait partiellement validé.

## 13. Règles Markdown initiales

Chaque fichier Markdown doit :

- être encodé en UTF-8 valide ;
- utiliser des fins de ligne cohérentes ;
- être non vide ;
- rester lisible comme texte brut ;
- ne contenir aucun secret ;
- ne contenir aucune donnée personnelle réelle ;
- ne pas dépendre d’un script pour être compris.

Dans la version initiale, sont interdits :

- le HTML brut ;
- les balises `script`, `iframe`, `object`, `embed` et équivalentes ;
- les URL utilisant `javascript:`, `data:`, `file:` ou `vbscript:` ;
- les liens relatifs sortant de la racine ;
- les références à des fichiers absents ;
- les images intégrées ;
- les contenus actifs.

Les liens HTTPS externes peuvent être présents, mais leur contenu ne doit pas être téléchargé
pendant la validation du paquet.

La politique complète de rendu Markdown sécurisé sera définie dans une phase séparée.

## 14. Manifeste obligatoire

Chaque paquet doit contenir exactement un fichier :

```text
promptube-module.json
```

Il doit se trouver directement à la racine logique.

Le manifeste devra notamment porter :

- la version du format de manifeste ;
- l’identifiant stable du module ;
- le slug ;
- le nom ;
- la version distribuable ;
- la langue ;
- la catégorie ;
- la sous-catégorie ;
- le fichier d’entrée ;
- l’inventaire de chaque fichier distribuable, à l’exception du manifeste lui-même ;
- l’empreinte SHA-256 de chaque fichier inventorié ;
- les compatibilités déclarées ;
- les informations de licence applicables.

Le schéma exact, les champs obligatoires et les règles de compatibilité seront définis dans le
contrat versionné du manifeste.

Le manifeste ne doit contenir aucun secret ni emplacement privé de stockage.

## 15. Intégrité

L’intégrité repose sur deux niveaux distincts.

### Intégrité des fichiers

Le futur manifeste contiendra l’inventaire et l’empreinte SHA-256 des fichiers du paquet, selon une
règle de canonicalisation à définir.

Le manifeste ne doit pas contenir sa propre empreinte afin d’éviter une dépendance circulaire.

### Intégrité de l’archive

L’empreinte SHA-256 du ZIP complet est calculée après sa construction.

Cette empreinte est conservée dans les métadonnées administratives et dans les reçus de publication.
Elle ne peut pas être stockée à l’intérieur du ZIP comme preuve de sa propre intégrité.

Toute modification du ZIP produit une nouvelle empreinte et invalide la validation précédente.

## 16. Séquence de validation

La validation doit suivre cet ordre :

1. recevoir l’archive dans une zone temporaire privée ;
2. attribuer un nom interne généré par le serveur ;
3. calculer le SHA-256 du ZIP reçu ;
4. vérifier la signature binaire du format ZIP et le type réel ;
5. inspecter les entrées sans les exécuter ;
6. contrôler les chemins, types, quantités et tailles ;
7. refuser les liens, fichiers spéciaux et archives imbriquées ;
8. extraire dans un répertoire temporaire isolé ;
9. vérifier les tailles réellement extraites ;
10. vérifier la structure obligatoire ;
11. valider `promptube-module.json` avec son schéma versionné ;
12. vérifier l’inventaire et les empreintes des fichiers ;
13. appliquer la politique Markdown sécurisée ;
14. produire un rapport de validation ;
15. déplacer l’artefact conforme vers une zone privée de préparation ;
16. supprimer tous les fichiers temporaires.

Un contrôle échoué arrête le processus. Une validation partielle ne doit jamais être présentée comme
une réussite.

## 17. Rapport de validation

Chaque tentative doit produire un résultat vérifiable contenant au minimum :

- l’identifiant de validation ;
- la date ;
- l’empreinte SHA-256 de l’archive ;
- le nom original reçu ;
- la taille compressée ;
- la taille décompressée ;
- le nombre de fichiers ;
- la version du contrat appliqué ;
- la version du schéma de manifeste ;
- les contrôles exécutés ;
- les erreurs détectées ;
- les avertissements ;
- le verdict final.

Verdicts initiaux :

```text
VALID
INVALID
VALID_WITH_WARNINGS
```

`VALID_WITH_WARNINGS` ne doit jamais masquer un contrôle de sécurité obligatoire ayant échoué.

## 18. Portée des verdicts

`VALID` signifie uniquement que l’archive respecte les contrôles techniques connus du contrat
appliqué.

`VALID` ne signifie pas automatiquement :

- que la fiche produit est approuvée ;
- que le contenu est commercialement pertinent ;
- que les instructions sont correctes ;
- que le module est compatible avec toutes les IA ;
- que l’archive est exempte de toute vulnérabilité ;
- que la version peut être publiée ;
- que le propriétaire a autorisé sa distribution.

La publication reste une décision distincte et explicitement autorisée.

## 19. Versionnage et immutabilité

Une version publiée doit être immuable.

Toute modification de contenu impose :

- une nouvelle version ;
- une nouvelle archive ;
- une nouvelle empreinte SHA-256 ;
- une nouvelle validation ;
- un nouvel enregistrement de publication.

Une archive déjà publiée ne doit jamais être remplacée silencieusement sous la même version.

Une correction documentaire suit les règles de versionnage sémantique du produit.

## 20. Construction reproductible

La construction d’une archive devra progressivement devenir reproductible.

Le futur pipeline devra notamment fixer :

- l’ordre des entrées ;
- les séparateurs de chemin ;
- l’encodage ;
- les permissions ;
- les horodatages ;
- la méthode et le niveau de compression ;
- l’exclusion des métadonnées locales ;
- l’outil et sa version.

Deux constructions du même dossier source avec les mêmes paramètres devraient produire la même
empreinte.

Les dates de construction et de validation doivent être conservées dans les métadonnées
administratives externes. Aucun horodatage variable ne doit être injecté dans le paquet sans règle
de normalisation explicite.

Cette propriété devra être prouvée par des tests avant la publication commerciale.

## 21. Parcours manuel prévu

Le parcours initial reste manuel et guidé :

1. créer le dossier complet du module ;
2. rédiger les fichiers Markdown ;
3. créer le manifeste ;
4. contrôler localement l’arborescence ;
5. construire le ZIP ;
6. calculer son SHA-256 ;
7. importer l’archive depuis l’interface d’administration ;
8. exécuter les validations automatiques ;
9. examiner le rapport ;
10. demander explicitement la publication.

Le présent contrat encadre ce parcours sans encore l’implémenter.

## 22. Hors périmètre de cette version

Ce document n’implémente pas :

- le schéma JSON du manifeste ;
- le validateur applicatif ;
- le parseur ZIP ;
- le rendu Markdown ;
- l’analyse antimalware ;
- le stockage objet ;
- les migrations ;
- l’interface d’upload ;
- la signature numérique ;
- la publication ;
- le téléchargement ;
- la facturation ;
- les droits client.

Ces éléments nécessitent des phases et validations séparées.

## 23. Décisions différées

Les décisions suivantes restent ouvertes :

- confirmation des limites numériques ;
- format exact du manifeste ;
- règle de canonicalisation des fichiers ;
- bibliothèque ZIP retenue ;
- bibliothèque de validation JSON ;
- politique complète de rendu Markdown ;
- formats d’illustration futurs ;
- moteur d’analyse antimalware ;
- mécanisme de signature ;
- méthode exacte de construction reproductible ;
- codes d’erreur publics et privés ;
- durée de conservation des artefacts rejetés ;
- stockage définitif de production.

Aucune de ces décisions ne doit être intégrée silencieusement dans le code.

## 24. Critères de passage en revue

Le contrat peut passer de `DRAFT` à `IN_REVIEW` lorsque :

- la structure obligatoire est validée ;
- les formats autorisés sont validés ;
- les limites provisoires ont été testées sur les trois modules initiaux ;
- les règles de chemins couvrent les principales attaques ZIP ;
- les responsabilités du manifeste sont claires ;
- les frontières avec le stockage et la publication sont explicites ;
- le parcours manuel correspond à l’usage réel prévu ;
- aucune règle ne contredit les fiches produit approuvées ;
- les décisions différées sont visibles ;
- des scénarios de test malveillants sont définis.

## 25. Critères d’approbation

Le contrat peut passer à `APPROVED` lorsque :

- le propriétaire valide la structure et les limites ;
- le schéma versionné du manifeste est défini ;
- les règles Markdown sécurisées sont définies ;
- les archives valides et invalides peuvent être distinguées automatiquement ;
- les attaques de traversée de chemin sont rejetées ;
- les liens et fichiers spéciaux sont rejetés ;
- les ZIP bombs dépassant les limites sont interrompues ;
- les empreintes sont vérifiées ;
- la construction d’un paquet représentatif est reproductible ;
- les trois modules initiaux peuvent respecter le contrat sans contournement.
