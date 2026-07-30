# Contrat versionné du manifeste des modules Promptube

## Métadonnées

- **Version du contrat :** `0.1.0`
- **Statut :** `DRAFT`
- **Portée :** fichier `promptube-module.json` des paquets de modules Promptube
- **Version initiale envisagée du manifeste :** `1.0.0`
- **Format :** JSON strict
- **Encodage :** UTF-8 sans BOM
- **Schéma de validation prévu :** JSON Schema Draft 2020-12
- **Versionnage :** Semantic Versioning 2.0.0
- **Langues :** étiquettes BCP 47
- **Canonicalisation prévue :** JSON Canonicalization Scheme, RFC 8785
- **Algorithme d’intégrité :** SHA-256
- **Fondations de conception validées par le propriétaire :** 2026-07-30

## 1. Objectif

Ce document définit le contrat versionné du manifeste obligatoire de chaque paquet de module
Promptube.

Le manifeste fournit une description structurée et vérifiable :

- de l’identité du module ;
- de sa version ;
- de sa position dans le catalogue ;
- de son point d’entrée ;
- de l’inventaire exact de ses fichiers ;
- de l’intégrité de ses fichiers ;
- des capacités d’IA nécessaires ;
- des environnements réellement testés ;
- de sa licence.

Le manifeste permet au futur système de validation de déterminer automatiquement si un paquet
correspond au module et à la version sélectionnés dans l’interface d’administration.

Il ne remplace pas :

- la fiche produit ;
- le contrat technique du paquet ;
- les fichiers Markdown du module ;
- les contrôles de sécurité de l’archive ZIP ;
- les décisions du propriétaire ;
- les preuves de test ;
- les données du catalogue stockées par l’application.

## 2. Références normatives

Le contrat s’appuie sur les références suivantes :

- JSON Schema Draft 2020-12 pour la description et la validation structurelle ;
- Semantic Versioning 2.0.0 pour les versions du manifeste et du module ;
- BCP 47 et RFC 5646 pour les étiquettes de langue ;
- RFC 8785 pour la canonicalisation JSON ;
- SHA-256 pour les empreintes cryptographiques des fichiers ;
- le contrat technique des paquets de modules Promptube pour les règles applicables aux archives,
  fichiers et chemins.

Les références officielles sont :

- [JSON Schema](https://json-schema.org/specification) ;
- [Semantic Versioning 2.0.0](https://semver.org/) ;
- [RFC 5646 — Language Tags](https://www.rfc-editor.org/rfc/rfc5646) ;
- [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785).

Le futur schéma JSON devra être conservé dans le dépôt et utilisé sans téléchargement de ressources
externes pendant la validation d’un paquet.

## 3. Définitions

### Manifeste

Le manifeste est le fichier JSON nommé exactement `promptube-module.json`, placé à la racine du
paquet.

### Version du manifeste

La version du manifeste décrit la version de son contrat structurel.

Elle est indépendante de la version commerciale ou fonctionnelle du module.

### Version du module

La version du module identifie une version distribuable précise de son contenu.

### Identifiant du module

L’identifiant du module est une valeur stable et non ambiguë permettant de relier le paquet au
module correspondant dans le catalogue Promptube.

### Slug du module

Le slug est le nom technique lisible utilisé dans les chemins, les noms d’archives et les
interfaces.

### Inventaire

L’inventaire est la liste exhaustive de tous les fichiers distribuables du paquet, à l’exception du
manifeste lui-même.

### Point d’entrée

Le point d’entrée est le premier fichier Markdown qu’une IA ou un utilisateur doit consulter pour
utiliser le module.

### Canonicalisation

La canonicalisation transforme un objet JSON valide en une représentation binaire déterministe afin
que deux objets logiquement identiques produisent les mêmes octets.

### Capacité requise

Une capacité requise décrit une fonctionnalité nécessaire de l’environnement d’IA, sans promettre
qu’un fournisseur ou qu’un modèle particulier la prend universellement en charge.

### Environnement testé

Un environnement testé identifie une combinaison réelle de fournisseur, modèle, interface et date
ayant fait l’objet d’un test documenté.

## 4. Relation avec les autres contrats

Le manifeste doit respecter simultanément :

1. la fiche produit approuvée du module ;
2. le contrat documentaire des produits Promptube ;
3. le contrat technique des paquets de modules Promptube ;
4. le présent contrat ;
5. le futur schéma JSON correspondant à la version déclarée du manifeste.

En cas de contradiction :

- la sécurité du paquet prévaut sur une commodité de rédaction ;
- le présent contrat prévaut sur un exemple non normatif ;
- le schéma ne doit pas autoriser une valeur interdite par le présent contrat ;
- une contradiction entre deux contrats doit bloquer la validation ;
- aucune interprétation silencieuse ne doit être appliquée.

Un paquet ne doit pas être accepté uniquement parce que son manifeste respecte le schéma JSON.

Les contrôles métier, les contrôles de cohérence et la vérification réelle des fichiers restent
obligatoires.

## 5. Emplacement et nom du fichier

Le manifeste doit être placé directement à la racine logique du paquet.

Son nom exact est :

```text
promptube-module.json
```

Les variantes suivantes doivent notamment être rejetées :

```text
Promptube-module.json
promptube_module.json
promptube-module.JSON
manifest.json
metadata.json
configuration/promptube-module.json
```

Le paquet doit contenir exactement un manifeste.

Un manifeste absent, dupliqué, déplacé ou nommé différemment rend le paquet invalide.

Le manifeste ne doit jamais être recherché récursivement comme solution de remplacement.

## 6. Encodage et représentation

Le manifeste doit :

- être encodé en UTF-8 valide ;
- ne pas commencer par un BOM ;
- contenir un seul document JSON ;
- avoir un objet JSON comme valeur racine ;
- ne contenir aucun octet après la fin du document, à l’exception d’un espace blanc JSON autorisé ;
- respecter les limites de taille définies par le présent contrat ;
- pouvoir être canonicalisé selon le RFC 8785.

Les fins de ligne du fichier source peuvent être `LF` ou `CRLF` avant canonicalisation.

La version canonicalisée utilisée pour construire l’artefact doit être produite de manière
déterministe.

## 7. Taille et complexité initiales

Les limites suivantes sont provisoires et devront être confirmées par des tests techniques :

| Élément                                    | Limite initiale  |
| ------------------------------------------ | ---------------- |
| Taille du manifeste avant canonicalisation | 64 Kio           |
| Profondeur maximale du document JSON       | 16 niveaux       |
| Nombre maximal de propriétés par objet     | 32               |
| Longueur maximale d’une chaîne générale    | 1 024 caractères |
| Nombre maximal de fichiers inventoriés     | 200              |
| Nombre maximal de capacités requises       | 32               |
| Nombre maximal d’environnements testés     | 32               |
| Nombre maximal de limitations par test     | 32               |

Une valeur plus restrictive définie par le contrat du paquet reste applicable.

Le validateur doit interrompre l’analyse lorsqu’une limite est dépassée.

Il ne doit pas charger un document manifestement excessif avant d’avoir vérifié sa taille brute.

## 8. Structure générale

La structure initiale envisagée est la suivante :

```text
promptube-module.json
├── manifestVersion
├── module
│   ├── id
│   ├── slug
│   ├── name
│   ├── version
│   ├── language
│   ├── category
│   ├── subcategory
│   └── entrypoint
├── files
│   └── []
│       ├── path
│       ├── size
│       └── sha256
├── compatibility
│   ├── requiredCapabilities
│   └── testedEnvironments
└── license
    ├── id
    └── version
```

Les propriétés de premier niveau envisagées sont :

| Propriété         | Type    | Présence                      |
| ----------------- | ------- | ----------------------------- |
| `manifestVersion` | chaîne  | obligatoire                   |
| `module`          | objet   | obligatoire                   |
| `files`           | tableau | obligatoire                   |
| `compatibility`   | objet   | obligatoire                   |
| `license`         | objet   | obligatoire avant publication |

La politique exacte applicable à `license` pendant les phases de construction interne reste à
confirmer avant la création du schéma définitif.

Aucune propriété inconnue ne doit être acceptée.

Le futur schéma doit utiliser `additionalProperties: false` pour chaque objet fermé.

Le propriétaire a validé le 30 juillet 2026 les cinq fondations suivantes :

1. le fichier porte exactement le nom `promptube-module.json` et utilise du JSON strict encodé en
   UTF-8 sans BOM ;
2. sa structure initiale contient `manifestVersion`, `module`, `files`, `compatibility` et
   `license`, sans propriété inconnue ;
3. l’inventaire contient tous les fichiers distribuables sauf le manifeste lui-même, avec leur
   taille exacte et leur empreinte SHA-256 ;
4. les normes retenues sont Semantic Versioning 2.0.0, BCP 47, JSON Schema Draft 2020-12 et le RFC
   8785 ;
5. les informations d’identité et de classement doivent correspondre au contexte sélectionné dans le
   catalogue, sans création ni déplacement automatique d’un produit.

Cette validation autorise la conception du schéma JSON initial. Elle ne fait pas passer le contrat à
`APPROVED` et ne valide pas encore les identifiants définitifs, la licence commerciale, la liste
normative des capacités ou les limites techniques non testées.

## 9. Version du manifeste

La propriété `manifestVersion` identifie la version du contrat structurel du manifeste.

Valeur initiale envisagée :

```json
"manifestVersion": "1.0.0"
```

La valeur doit :

- être une chaîne ;
- respecter Semantic Versioning 2.0.0 ;
- correspondre à une version explicitement prise en charge par le validateur ;
- ne pas être corrigée ou convertie silencieusement ;
- ne pas être déduite de la version du module.

Un validateur ne doit pas supposer que la dernière version connue est applicable lorsqu’une version
inconnue est fournie.

Une version majeure inconnue doit être rejetée.

Une version mineure ou corrective inconnue doit également être rejetée tant que sa compatibilité
n’est pas explicitement implémentée et testée.

## 10. Objet `module`

L’objet `module` décrit l’identité stable et la position du module dans le catalogue.

Il contient les propriétés suivantes :

| Propriété     | Type   | Présence    |
| ------------- | ------ | ----------- |
| `id`          | chaîne | obligatoire |
| `slug`        | chaîne | obligatoire |
| `name`        | chaîne | obligatoire |
| `version`     | chaîne | obligatoire |
| `language`    | chaîne | obligatoire |
| `category`    | chaîne | obligatoire |
| `subcategory` | chaîne | obligatoire |
| `entrypoint`  | chaîne | obligatoire |

Aucune propriété supplémentaire ne doit être acceptée dans cet objet.

Chaque valeur doit être comparée aux informations attendues par l’opération d’import dans
l’interface d’administration.

## 11. Identifiant du module

La propriété `module.id` contient l’identifiant stable du module.

L’identifiant doit :

- être attribué avant la première publication du module ;
- rester identique entre les versions du même module ;
- identifier un seul module ;
- correspondre exactement au module sélectionné dans l’interface d’administration ;
- ne pas contenir de donnée personnelle ;
- ne pas contenir de secret ;
- ne pas être recyclé pour un autre produit.

L’identifiant initial doit utiliser uniquement :

- les lettres minuscules ASCII ;
- les chiffres ASCII ;
- le tiret simple.

Expression de référence envisagée :

```regex
^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$
```

La longueur maximale est de 64 caractères.

Les valeurs suivantes sont interdites :

- un identifiant vide ;
- un identifiant uniquement numérique ;
- deux tirets successifs ;
- un tiret initial ou final ;
- une différence fondée uniquement sur la casse ;
- un identifiant ressemblant à un chemin ;
- un identifiant déjà associé à un autre module.

Les identifiants définitifs des trois modules initiaux devront être approuvés avant la création de
leurs premiers paquets distribuables.

## 12. Slug du module

La propriété `module.slug` contient le slug technique du module.

Le slug doit :

- respecter les règles de nommage du contrat du paquet ;
- correspondre au nom technique approuvé dans le catalogue ;
- correspondre à la convention de nommage de l’archive ;
- rester stable entre les versions ;
- être unique dans son espace de publication ;
- ne contenir aucune information de version.

Expression de référence envisagée :

```regex
^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$
```

Exemple de slug possible :

```json
"slug": "architecte-projet-logiciel"
```

Cet exemple illustre le format attendu. Il ne constitue pas à lui seul une attribution définitive.

Les valeurs suivantes doivent être rejetées :

```text
Architecte-Projet-Logiciel
architecte_projet_logiciel
architecte projet logiciel
architecte-projet-logiciel-1.0.0
../architecte-projet-logiciel
architecte--projet
```

## 13. Nom du module

La propriété `module.name` contient le nom commercial ou éditorial approuvé du module.

Le nom doit :

- être une chaîne non vide ;
- être encodé en UTF-8 ;
- correspondre à la fiche produit approuvée ;
- correspondre au module sélectionné dans le catalogue ;
- être présenté sans balisage HTML ;
- ne contenir aucun caractère de contrôle ;
- ne pas être utilisé comme identifiant technique.

La longueur initiale envisagée est comprise entre 1 et 160 caractères Unicode.

Les espaces au début et à la fin sont interdits.

Les suites d’espaces inutiles ne doivent pas être normalisées silencieusement par le validateur.

Une différence entre le nom du manifeste et le nom attendu doit produire une erreur de cohérence.

## 14. Version du module

La propriété `module.version` identifie la version distribuable du module.

La valeur doit :

- respecter Semantic Versioning 2.0.0 ;
- correspondre à la version sélectionnée dans l’interface d’administration ;
- correspondre à la convention de nommage de l’archive ;
- identifier un contenu immuable après publication ;
- être différente lorsqu’un fichier distribué change après une publication.

Exemple :

```json
"version": "1.0.0"
```

Les préversions peuvent être utiles pour les tests internes :

```text
1.0.0-alpha.1
1.0.0-beta.2
1.0.0-rc.1
```

La politique commerciale applicable aux préversions reste à définir.

L’utilisation des métadonnées de construction SemVer, par exemple `1.0.0+build.12`, reste différée
car elle peut créer plusieurs noms représentant une même précédence de version.

Aucune version ne doit être :

- préfixée silencieusement par `v` ;
- complétée automatiquement ;
- convertie depuis un nombre ;
- déduite du nom de fichier uniquement.

Les valeurs suivantes sont invalides :

```text
v1.0.0
1
1.0
01.0.0
1.0.0.0
latest
stable
```

## 15. Langue

La propriété `module.language` décrit la langue principale du module.

Elle doit utiliser une étiquette conforme à BCP 47.

Exemples possibles :

```json
"language": "fr"
```

```json
"language": "fr-CI"
```

```json
"language": "en"
```

La casse doit suivre la forme canonique habituelle des étiquettes BCP 47 :

- langue en minuscules ;
- région en majuscules lorsqu’elle est présente ;
- script avec une majuscule initiale lorsqu’il est présent.

Le validateur doit refuser :

- les noms de langues libres comme `français` ;
- les séparateurs `_` comme `fr_CI` ;
- les étiquettes mal formées ;
- une langue ne correspondant pas au contenu principal annoncé.

La validation syntaxique ne prouve pas que le contenu du module est réellement écrit dans cette
langue.

Cette cohérence devra être vérifiée séparément.

## 16. Catégorie et sous-catégorie

Les propriétés `module.category` et `module.subcategory` contiennent des identifiants techniques
stables du catalogue.

Elles ne contiennent pas les libellés commerciaux affichés à l’utilisateur.

Exemple envisagé pour le bundle initial :

```json
"category": "developpement-logiciel"
```

```json
"subcategory": "ingenierie-logicielle-assistee-par-ia"
```

Ces valeurs doivent :

- respecter les règles de slug ;
- correspondre à des enregistrements existants ;
- représenter une relation catégorie–sous-catégorie valide ;
- correspondre au module sélectionné pour l’import ;
- ne pas être créées automatiquement depuis le manifeste.

Le manifeste ne doit pas pouvoir :

- créer une catégorie ;
- créer une sous-catégorie ;
- déplacer silencieusement un module ;
- remplacer les relations enregistrées dans le catalogue.

Une incohérence doit bloquer l’import.

## 17. Point d’entrée

La propriété `module.entrypoint` identifie le premier fichier à consulter.

Pour la version initiale du contrat, sa valeur doit être exactement :

```json
"entrypoint": "README.md"
```

Le point d’entrée doit :

- être un chemin relatif valide ;
- être présent dans l’inventaire `files` ;
- correspondre à un fichier régulier non vide ;
- respecter les règles Markdown sécurisées ;
- être situé à la racine du paquet ;
- avoir l’empreinte et la taille déclarées dans l’inventaire.

Les valeurs suivantes doivent être rejetées :

```text
readme.md
./README.md
/README.md
../README.md
documentation/README.md
README.html
```

Une future version majeure du contrat pourra autoriser un autre point d’entrée si un besoin réel est
démontré.

## 18. Tableau `files`

La propriété `files` contient l’inventaire exhaustif des fichiers distribuables.

Elle doit être :

- un tableau non vide ;
- limitée au nombre maximal de fichiers autorisé ;
- triée selon une règle déterministe ;
- sans doublon ;
- sans collision de casse ;
- sans entrée représentant le manifeste lui-même.

Chaque élément contient exactement :

| Propriété | Type   | Présence    |
| --------- | ------ | ----------- |
| `path`    | chaîne | obligatoire |
| `size`    | entier | obligatoire |
| `sha256`  | chaîne | obligatoire |

Aucune propriété supplémentaire ne doit être acceptée dans un élément.

Le fichier `promptube-module.json` doit être exclu de `files` afin d’éviter une dépendance
circulaire entre le contenu du manifeste et sa propre empreinte.

L’empreinte externe de l’archive couvre néanmoins le manifeste avec l’ensemble du paquet.

## 19. Chemins inventoriés

La propriété `files[].path` contient le chemin relatif exact d’un fichier.

Le chemin doit :

- respecter toutes les règles du contrat du paquet ;
- utiliser `/` comme séparateur ;
- commencer directement par un nom de fichier ou de dossier ;
- désigner un fichier régulier autorisé ;
- être unique ;
- être représenté sous sa forme canonique ;
- correspondre exactement à une entrée réelle de l’archive.

Les formes suivantes doivent être rejetées :

```text
/README.md
./README.md
../README.md
instructions/../README.md
instructions//role.md
instructions\role.md
instructions/
promptube-module.json
```

Le validateur doit rejeter :

- les traversées de chemin ;
- les chemins absolus ;
- les lettres de lecteur Windows ;
- les chemins UNC ;
- les segments vides ;
- les segments `.` ou `..` ;
- les caractères NUL ;
- les séparateurs ambigus ;
- les liens symboliques ;
- les fichiers spéciaux ;
- les collisions après comparaison sans distinction de casse ;
- les collisions après la normalisation autorisée par le contrat du paquet.

Un chemin ne doit jamais être réparé avant comparaison avec l’archive.

## 20. Ordre de l’inventaire

Le tableau `files` doit suivre un ordre déterministe.

L’ordre initial envisagé est l’ordre lexicographique croissant des octets UTF-8 des chemins
préalablement validés dans leur forme canonique.

L’ordre ne doit pas dépendre :

- de la langue du système ;
- de la locale active ;
- de l’ordre d’ajout dans l’archive ;
- du système d’exploitation ;
- de la casse appliquée automatiquement ;
- de la date de création des fichiers.

Un inventaire contenant les bons fichiers dans un ordre différent doit être rejeté ou recanonicalisé
avant la construction finale du paquet.

Le validateur d’import ne doit pas modifier silencieusement un manifeste distribué.

## 21. Taille des fichiers

La propriété `files[].size` contient la taille exacte du fichier en octets.

Elle doit :

- être un entier JSON ;
- être strictement positive ;
- rester dans la limite individuelle du contrat du paquet ;
- correspondre exactement à la taille du fichier décompressé ;
- rester dans l’intervalle sûr des entiers utilisé par l’implémentation.

Elle ne doit pas être :

- une chaîne ;
- un nombre décimal ;
- un nombre négatif ;
- une notation exponentielle ambiguë ;
- une valeur supérieure aux limites autorisées ;
- calculée à partir du nombre de caractères Unicode.

Exemple de forme :

```json
"size": 1234
```

La valeur doit être calculée sur les octets exacts du fichier inclus dans le paquet final.

Une différence d’un seul octet doit produire une erreur.

## 22. Empreinte des fichiers

La propriété `files[].sha256` contient l’empreinte SHA-256 du fichier exact.

Elle doit :

- contenir 64 caractères hexadécimaux minuscules ;
- être calculée sur les octets du fichier distribué ;
- correspondre au fichier identifié par `path` ;
- être vérifiée avant l’acceptation du paquet.

Expression de référence :

```regex
^[a-f0-9]{64}$
```

Les formats suivants sont interdits :

- empreinte en majuscules ;
- préfixe `sha256:` ;
- Base64 ;
- empreinte tronquée ;
- autre algorithme ;
- valeur vide ;
- empreinte calculée avant une modification ultérieure du fichier.

Le manifeste ne contient pas sa propre empreinte.

L’empreinte SHA-256 de l’archive complète doit être conservée en dehors de l’archive, conformément
au contrat du paquet.

## 23. Exhaustivité de l’inventaire

L’inventaire doit contenir exactement une entrée pour chaque fichier distribuable autre que
`promptube-module.json`.

La validation doit vérifier simultanément :

- qu’aucun fichier réel n’est absent de l’inventaire ;
- qu’aucune entrée de l’inventaire ne désigne un fichier absent ;
- qu’aucun fichier n’est inventorié plusieurs fois ;
- que le point d’entrée est inventorié ;
- que chaque dossier obligatoire contient au moins un fichier inventorié ;
- que les chemins correspondent exactement ;
- que les tailles correspondent exactement ;
- que les empreintes correspondent exactement.

La présence d’un fichier non inventorié doit bloquer l’import, même si ce fichier semble inoffensif.

Cela inclut notamment :

```text
.DS_Store
Thumbs.db
notes.txt
backup.zip
README.md~
fichier.kate-swp
```

## 24. Objet `compatibility`

L’objet `compatibility` décrit les capacités nécessaires et les environnements réellement testés.

Il contient exactement :

| Propriété              | Type    | Présence    |
| ---------------------- | ------- | ----------- |
| `requiredCapabilities` | tableau | obligatoire |
| `testedEnvironments`   | tableau | obligatoire |

Aucune compatibilité universelle ne doit être déduite de cet objet.

L’absence d’un environnement testé ne signifie ni compatibilité ni incompatibilité.

## 25. Capacités requises

La propriété `compatibility.requiredCapabilities` contient une liste d’identifiants de capacités.

Les identifiants doivent :

- appartenir à une liste contrôlée et versionnée ;
- être uniques ;
- être triés ;
- utiliser des slugs ASCII stables ;
- décrire une capacité, pas une marque ou un modèle ;
- correspondre à un besoin réel du module.

Exemples de capacités candidates :

```text
multi-file-reading
hierarchical-instructions
markdown-rendering
repository-inspection
tool-use
long-context
```

Cette liste n’est pas encore l’énumération normative définitive.

Les capacités non nécessaires ne doivent pas être ajoutées pour des raisons commerciales.

Un fournisseur ou un modèle ne doit jamais apparaître dans `requiredCapabilities`.

## 26. Environnements testés

La propriété `compatibility.testedEnvironments` contient les environnements ayant fait l’objet d’un
test documenté.

Chaque entrée envisagée contient exactement :

| Propriété     | Type    | Présence    |
| ------------- | ------- | ----------- |
| `provider`    | chaîne  | obligatoire |
| `model`       | chaîne  | obligatoire |
| `interface`   | chaîne  | obligatoire |
| `testedAt`    | chaîne  | obligatoire |
| `result`      | chaîne  | obligatoire |
| `limitations` | tableau | obligatoire |

Valeurs envisagées pour `result` :

```text
PASS
PASS_WITH_LIMITATIONS
FAIL
```

La propriété `testedAt` doit utiliser une date civile complète au format ISO :

```text
YYYY-MM-DD
```

Cette date décrit la preuve de test du produit.

Elle n’est pas une date de construction de l’archive et n’empêche pas une construction
reproductible, à condition de rester identique pour une version donnée du module.

Les limitations doivent :

- être factuelles ;
- être compréhensibles ;
- ne pas contenir de secret ;
- ne pas contenir de donnée personnelle ;
- correspondre au résultat du test.

Une entrée de test ne doit pas être créée sans exécution réelle du test correspondant.

Une modification des preuves de compatibilité après publication nécessite une nouvelle version du
module.

Pour une version de travail interne, `testedEnvironments` peut être vide.

La publication commerciale devra exiger une politique de preuves explicitement approuvée.

## 27. Objet `license`

L’objet `license` identifie la licence applicable au module.

La structure initiale envisagée contient exactement :

| Propriété | Type   | Présence    |
| --------- | ------ | ----------- |
| `id`      | chaîne | obligatoire |
| `version` | chaîne | obligatoire |

L’identifiant doit être :

- stable ;
- non ambigu ;
- défini par la politique commerciale Promptube ;
- indépendant d’une URL de stockage ;
- dépourvu de secret ;
- distinct du nom du module.

Exemple de forme envisagée :

```json
{
  "id": "promptube-proprietary",
  "version": "1.0"
}
```

Cet exemple ne constitue pas l’approbation d’une licence commerciale définitive.

Le manifeste ne doit contenir :

- aucun jeton d’accès ;
- aucune URL signée ;
- aucune clé de licence client ;
- aucune donnée d’achat ;
- aucun identifiant personnel d’acheteur ;
- aucune règle de contrôle d’accès secrète.

La politique de licence définitive doit être approuvée avant que le contrat du manifeste passe à
`APPROVED`.

## 28. JSON strict

Le manifeste doit utiliser du JSON strict.

Les éléments suivants sont interdits :

- commentaires ;
- virgules finales ;
- chaînes entre apostrophes ;
- clés non entourées de guillemets ;
- `NaN` ;
- `Infinity` ;
- `-Infinity` ;
- valeurs `undefined` ;
- nombres non conformes à JSON ;
- propriétés dupliquées ;
- données placées après l’objet racine.

Exemple invalide :

```text
{
  // commentaire interdit
  "manifestVersion": "1.0.0",
}
```

Le validateur ne doit pas utiliser un parseur permissif comme moyen d’accepter ces formes.

## 29. Propriétés dupliquées

Toute propriété dupliquée dans le même objet doit être rejetée avant ou pendant l’analyse JSON.

Exemple invalide :

```json
{
  "manifestVersion": "1.0.0",
  "manifestVersion": "2.0.0"
}
```

Le validateur ne doit jamais :

- conserver silencieusement la première valeur ;
- conserver silencieusement la dernière valeur ;
- fusionner les valeurs ;
- déléguer ce comportement à une bibliothèque sans contrôle explicite.

Cette règle s’applique à tous les objets du manifeste.

## 30. Propriétés dangereuses

Les propriétés suivantes doivent être rejetées à tous les niveaux, même si le schéma interdit déjà
les propriétés inconnues :

```text
__proto__
prototype
constructor
```

Le manifeste doit être représenté avec des structures de données qui ne permettent pas une
modification involontaire de prototypes ou de comportements exécutables.

Aucune valeur du manifeste ne doit être évaluée comme :

- code JavaScript ;
- expression ;
- modèle dynamique ;
- commande système ;
- chemin de module ;
- configuration exécutable.

## 31. Propriétés inconnues

Le manifeste initial utilise des objets fermés.

Toute propriété inconnue doit être rejetée.

Exemple :

```json
{
  "manifestVersion": "1.0.0",
  "downloadUrl": "https://example.invalid/module.zip"
}
```

La présence de `downloadUrl` doit être refusée si cette propriété n’existe pas dans la version
déclarée du contrat.

Cette politique évite :

- les fautes de frappe ignorées ;
- les fonctionnalités cachées ;
- les extensions non contrôlées ;
- les divergences entre validateurs ;
- l’introduction silencieuse de données sensibles.

Une nouvelle propriété doit être introduite par une nouvelle version du contrat.

## 32. Validation JSON Schema

Le futur schéma doit respecter JSON Schema Draft 2020-12.

Il devra notamment définir :

- les types exacts ;
- les propriétés obligatoires ;
- les longueurs minimales et maximales ;
- les expressions régulières ;
- les valeurs d’énumération ;
- les limites des tableaux ;
- les limites numériques ;
- l’interdiction des propriétés supplémentaires ;
- les formats applicables ;
- la structure fermée de chaque objet.

Le validateur doit :

- charger uniquement un schéma connu et local ;
- sélectionner le schéma à partir de `manifestVersion` ;
- ne jamais résoudre automatiquement une référence sur Internet ;
- utiliser un registre explicite de schémas autorisés ;
- échouer si le schéma attendu est absent ;
- produire des erreurs compréhensibles sans exposer le contenu complet du paquet.

Le schéma ne remplace pas les validations de cohérence métier.

## 33. Canonicalisation

Le manifeste destiné à l’artefact final doit être canonicalisé selon le RFC 8785.

La canonicalisation doit intervenir uniquement après :

1. la validation de l’encodage ;
2. le rejet des propriétés dupliquées ;
3. l’analyse JSON stricte ;
4. la validation structurelle ;
5. la validation métier ;
6. la réconciliation de l’inventaire.

La canonicalisation ne doit pas servir à réparer un manifeste invalide.

Le fichier source peut rester lisible et indenté pendant sa préparation.

Le constructeur du paquet doit produire la représentation canonicalisée de manière déterministe
avant de créer l’archive finale.

Les données doivent être compatibles avec les contraintes numériques et textuelles du RFC 8785.

Les octets canonicalisés doivent être les octets réellement placés dans le paquet final.

## 34. Absence de métadonnées de construction

Le manifeste initial ne doit pas contenir de métadonnée variant à chaque construction, notamment :

- date de construction ;
- heure de construction ;
- nom de machine ;
- chemin local ;
- nom d’utilisateur ;
- identifiant de processus ;
- ordre aléatoire ;
- identifiant de tâche temporaire.

Ces données empêcheraient deux constructions du même contenu de produire le même résultat.

Les informations opérationnelles de construction et de validation doivent être conservées dans le
rapport externe ou dans les métadonnées privées du système.

La propriété `compatibility.testedEnvironments[].testedAt` reste autorisée car elle appartient à la
preuve produit versionnée, pas à l’exécution technique de construction.

## 35. Cohérence avec le catalogue

Lors d’un import, le validateur doit recevoir explicitement le contexte attendu :

- catégorie sélectionnée ;
- sous-catégorie sélectionnée ;
- module sélectionné ;
- version sélectionnée ;
- statut de l’opération ;
- identité de l’administrateur autorisé.

Le manifeste doit être comparé à ce contexte.

Les contrôles doivent vérifier :

- `module.id` ;
- `module.slug` ;
- `module.name` selon la politique approuvée ;
- `module.version` ;
- `module.language` ;
- `module.category` ;
- `module.subcategory`.

Le manifeste ne doit jamais remplacer automatiquement le contexte d’import.

En cas de différence, l’opération doit être bloquée et expliquée.

## 36. Cohérence avec l’archive

Le validateur doit vérifier que :

- le nom de l’archive respecte le contrat du paquet ;
- la racine logique respecte le contrat du paquet ;
- le slug du manifeste correspond au slug attendu ;
- la version du manifeste correspond à la version attendue ;
- le point d’entrée existe ;
- tous les fichiers autorisés sont inventoriés ;
- aucun fichier interdit n’est présent ;
- les tailles correspondent ;
- les empreintes correspondent ;
- les limites globales sont respectées.

Aucune information du manifeste ne doit être considérée comme vraie avant sa comparaison avec les
données réelles de l’archive.

## 37. Séquence de validation

La séquence initiale de validation du manifeste doit être :

1. localiser exactement `promptube-module.json` à la racine ;
2. vérifier qu’il existe une seule fois ;
3. vérifier sa taille brute ;
4. vérifier son encodage UTF-8 et l’absence de BOM ;
5. appliquer les limites de profondeur, de propriétés et de jetons ;
6. détecter les propriétés dupliquées ;
7. analyser le JSON strict ;
8. vérifier que la racine est un objet ;
9. lire `manifestVersion` sans accepter de conversion ;
10. sélectionner un schéma local explicitement pris en charge ;
11. valider le document avec JSON Schema Draft 2020-12 ;
12. appliquer les règles métier et les contrôles croisés ;
13. inspecter la structure réelle de l’archive ;
14. réconcilier l’inventaire avec les fichiers réels ;
15. vérifier chaque taille ;
16. calculer et vérifier chaque empreinte SHA-256 ;
17. vérifier les limites de sécurité globales ;
18. canonicaliser le manifeste ;
19. produire le rapport de validation ;
20. autoriser ou refuser la suite de l’import.

Une erreur à une étape doit empêcher les étapes qui supposent cette étape réussie.

Les contrôles de sécurité nécessaires à l’inspection sûre de l’archive restent prioritaires.

## 38. Rapport de validation

Le rapport doit distinguer :

- les erreurs bloquantes ;
- les avertissements ;
- les informations ;
- les contrôles non exécutés ;
- les limites de l’analyse.

Chaque constat doit contenir au minimum :

- un code stable ;
- un niveau ;
- un message compréhensible ;
- le chemin JSON concerné lorsque cela est sûr ;
- le chemin du fichier concerné lorsque cela est sûr ;
- la règle violée ;
- l’action attendue.

Exemple de codes envisagés :

```text
MANIFEST_MISSING
MANIFEST_DUPLICATE
MANIFEST_TOO_LARGE
MANIFEST_INVALID_UTF8
MANIFEST_BOM_FORBIDDEN
MANIFEST_DUPLICATE_PROPERTY
MANIFEST_INVALID_JSON
MANIFEST_UNSUPPORTED_VERSION
MANIFEST_SCHEMA_INVALID
MANIFEST_UNKNOWN_PROPERTY
MANIFEST_CATALOG_MISMATCH
MANIFEST_ENTRYPOINT_MISSING
MANIFEST_FILE_UNLISTED
MANIFEST_FILE_MISSING
MANIFEST_FILE_SIZE_MISMATCH
MANIFEST_FILE_HASH_MISMATCH
MANIFEST_FILE_ORDER_INVALID
MANIFEST_PATH_COLLISION
```

Le rapport ne doit pas afficher :

- les fichiers complets ;
- les secrets détectés ;
- les URL signées ;
- les données personnelles ;
- les contenus binaires ;
- les traces techniques sensibles.

## 39. Verdicts

Le validateur peut produire les verdicts suivants :

```text
VALID
INVALID
INCOMPLETE_VALIDATION
```

### `VALID`

Tous les contrôles obligatoires ont réussi pour la version déclarée du contrat.

### `INVALID`

Au moins une règle bloquante a échoué.

### `INCOMPLETE_VALIDATION`

Un contrôle obligatoire n’a pas pu être exécuté de manière fiable.

`INCOMPLETE_VALIDATION` ne doit jamais être traité comme `VALID`.

Un verdict valide ne signifie pas :

- que le module est commercialement approuvé ;
- que son contenu est utile ;
- qu’il est compatible avec toutes les IA ;
- qu’il est exempt de toute vulnérabilité ;
- qu’il peut être publié sans autre autorisation.

## 40. Scénarios obligatoires de rejet

Les tests du futur validateur devront couvrir au minimum :

- manifeste absent ;
- manifeste dupliqué ;
- manifeste placé dans un sous-dossier ;
- mauvais nom ou mauvaise casse ;
- fichier vide ;
- BOM UTF-8 ;
- encodage invalide ;
- taille excessive ;
- profondeur JSON excessive ;
- JSON racine différent d’un objet ;
- commentaire JSON ;
- virgule finale ;
- propriété dupliquée ;
- propriété inconnue ;
- propriété dangereuse ;
- version du manifeste absente ;
- version du manifeste inconnue ;
- structure non conforme au schéma ;
- identifiant invalide ;
- slug invalide ;
- nom vide ;
- version SemVer invalide ;
- langue BCP 47 invalide ;
- catégorie inconnue ;
- sous-catégorie incohérente ;
- module différent du contexte d’import ;
- version différente du contexte d’import ;
- point d’entrée invalide ;
- point d’entrée absent de l’inventaire ;
- inventaire vide ;
- inventaire trop long ;
- inventaire non trié ;
- chemin dupliqué ;
- collision de casse ;
- traversée de chemin ;
- chemin absolu ;
- manifeste présent dans son propre inventaire ;
- fichier réel non inventorié ;
- fichier inventorié absent ;
- taille incorrecte ;
- empreinte incorrecte ;
- empreinte mal formée ;
- nombre JSON dangereux ou hors limite ;
- capacité inconnue ;
- environnement testé mal formé ;
- résultat de test inconnu ;
- date de test invalide ;
- licence inconnue ou incomplète ;
- tentative de résolution externe d’un schéma ;
- échec de canonicalisation.

## 41. Gabarit illustratif

Le gabarit suivant montre la forme envisagée du manifeste.

Il est intentionnellement non validable tant que les valeurs placées entre chevrons n’ont pas été
remplacées par des valeurs approuvées et réellement calculées.

Il ne doit pas être copié directement dans un paquet distribuable.

```json
{
  "manifestVersion": "1.0.0",
  "module": {
    "id": "<identifiant-stable-approuve>",
    "slug": "architecte-projet-logiciel",
    "name": "Promptube — Architecte de projet logiciel",
    "version": "1.0.0",
    "language": "fr",
    "category": "developpement-logiciel",
    "subcategory": "ingenierie-logicielle-assistee-par-ia",
    "entrypoint": "README.md"
  },
  "files": [
    {
      "path": "README.md",
      "size": "<taille-exacte-en-octets>",
      "sha256": "<empreinte-sha256-reelle-en-minuscules>"
    },
    {
      "path": "instructions/role.md",
      "size": "<taille-exacte-en-octets>",
      "sha256": "<empreinte-sha256-reelle-en-minuscules>"
    },
    {
      "path": "rules/security.md",
      "size": "<taille-exacte-en-octets>",
      "sha256": "<empreinte-sha256-reelle-en-minuscules>"
    },
    {
      "path": "workflows/conception.md",
      "size": "<taille-exacte-en-octets>",
      "sha256": "<empreinte-sha256-reelle-en-minuscules>"
    }
  ],
  "compatibility": {
    "requiredCapabilities": ["hierarchical-instructions", "multi-file-reading"],
    "testedEnvironments": []
  },
  "license": {
    "id": "<identifiant-de-licence-approuve>",
    "version": "<version-de-licence-approuvee>"
  }
}
```

Les entrées réelles de `files` dépendront du contenu complet du module.

Le constructeur devra générer les tailles et empreintes depuis les fichiers finaux, puis trier
l’inventaire selon la règle normative.

## 42. Parcours manuel prévu

Le parcours initial reste manuel et contrôlé :

1. créer le dossier complet du module dans un espace de travail privé ;
2. rédiger les fichiers Markdown ;
3. vérifier la conformité des dossiers et chemins ;
4. choisir l’identité et la version attendues ;
5. générer l’inventaire des fichiers ;
6. calculer les tailles exactes ;
7. calculer les empreintes SHA-256 ;
8. produire `promptube-module.json` ;
9. valider le manifeste ;
10. canonicaliser le manifeste ;
11. construire l’archive de manière reproductible ;
12. calculer l’empreinte externe de l’archive ;
13. importer l’archive depuis l’interface d’administration ;
14. comparer le manifeste au contexte sélectionné ;
15. conserver le rapport de validation ;
16. publier uniquement après les autorisations nécessaires.

Le manifeste ne transforme pas le dépôt de l’application en espace de stockage des modules
commerciaux.

Les véritables dossiers et archives privés restent séparés du code de l’application.

## 43. Versionnage du contrat

Le présent contrat et la propriété `manifestVersion` suivent Semantic Versioning.

### Modification corrective

Une version `PATCH` peut couvrir :

- une clarification rédactionnelle ;
- une correction d’exemple ;
- une précision n’altérant pas les manifestes valides.

### Modification compatible

Une version `MINOR` peut couvrir :

- une nouvelle propriété facultative ;
- une nouvelle valeur explicitement compatible ;
- une nouvelle validation ne rejetant pas les manifestes précédemment valides de cette version
  majeure.

### Modification incompatible

Une version `MAJOR` est nécessaire notamment pour :

- ajouter une propriété obligatoire ;
- supprimer ou renommer une propriété ;
- modifier le sens d’une propriété ;
- interdire une valeur auparavant valide ;
- changer la règle d’inventaire ;
- changer l’algorithme d’intégrité ;
- changer la méthode de canonicalisation.

Une version publiée du schéma doit rester immuable.

Une correction incompatible ne doit jamais remplacer silencieusement un schéma déjà publié.

## 44. Prise en charge de plusieurs versions

Le futur validateur pourra prendre en charge plusieurs versions du manifeste.

Il devra alors :

- sélectionner explicitement le schéma correspondant ;
- appliquer les règles métier de cette version ;
- conserver des tests distincts ;
- empêcher une interprétation avec la mauvaise version ;
- documenter les versions encore acceptées ;
- documenter leur date de retrait éventuelle.

La prise en charge d’une ancienne version ne signifie pas que cette version peut encore être
utilisée pour une nouvelle publication.

Une politique de dépréciation devra être définie avant le retrait d’une version publiée.

## 45. Immutabilité après publication

Après publication d’une version de module :

- son manifeste devient immuable ;
- son inventaire devient immuable ;
- ses fichiers deviennent immuables ;
- ses empreintes deviennent immuables ;
- ses preuves de compatibilité versionnées deviennent immuables ;
- sa licence déclarée devient immuable pour cet artefact.

Toute modification nécessite :

1. une nouvelle version du module ;
2. un nouveau manifeste ;
3. de nouvelles empreintes ;
4. une nouvelle archive ;
5. une nouvelle validation ;
6. une nouvelle autorisation de publication.

Une archive existante ne doit jamais être remplacée silencieusement sous la même identité et la même
version.

## 46. Sécurité et confidentialité

Le manifeste est une donnée non fiable jusqu’à la fin de sa validation.

Il ne doit contenir aucun :

- secret ;
- mot de passe ;
- jeton ;
- certificat privé ;
- chemin local ;
- nom d’utilisateur système ;
- adresse privée d’infrastructure ;
- URL temporaire ;
- URL signée ;
- donnée personnelle réelle ;
- donnée client ;
- contenu exécutable.

Les messages d’erreur doivent être conçus pour aider l’administrateur sans révéler d’information
sensible.

Le manifeste ne doit déclencher :

- aucun accès réseau ;
- aucune exécution ;
- aucune installation ;
- aucun chargement dynamique ;
- aucune résolution de chemin hors de l’espace temporaire autorisé.

## 47. Hors périmètre de cette version

Le présent document ne crée pas encore :

- le fichier JSON Schema exécutable ;
- le validateur TypeScript ;
- les types TypeScript ;
- le générateur de manifeste ;
- le canonicaliseur ;
- le lecteur sécurisé d’archives ZIP ;
- les paquets réels des trois modules ;
- les fixtures de tests ;
- le stockage privé ;
- l’interface d’upload ;
- la publication ;
- le téléchargement ;
- la signature cryptographique des artefacts ;
- le système de licence ;
- la politique commerciale ;
- la compatibilité officielle avec des modèles d’IA.

Ces éléments nécessitent des phases d’implémentation et de validation séparées.

## 48. Décisions différées

Les décisions suivantes restent ouvertes :

- identifiants définitifs des trois modules initiaux ;
- URI définitive du schéma JSON ;
- emplacement définitif des schémas dans l’application ;
- bibliothèque de validation JSON Schema ;
- méthode technique de détection des propriétés dupliquées ;
- limites exactes de profondeur et de longueur des chaînes ;
- énumération normative des capacités d’IA ;
- structure définitive des preuves de test ;
- politique de publication des préversions ;
- politique applicable aux métadonnées SemVer de construction ;
- identifiant et version de la licence commerciale ;
- obligation de la licence pendant les constructions internes ;
- politique de dépréciation des versions du manifeste ;
- codes définitifs du rapport de validation ;
- format de stockage externe de l’empreinte de l’archive ;
- signature cryptographique future des artefacts.

Aucune de ces décisions ne doit être intégrée silencieusement au schéma ou à l’implémentation.

## 49. Critères de passage en revue

Le contrat peut passer de `DRAFT` à `IN_REVIEW` lorsque :

- toutes les propriétés envisagées sont décrites ;
- la séparation entre version du manifeste et version du module est claire ;
- les règles d’identité sont cohérentes avec le catalogue ;
- les règles d’inventaire sont cohérentes avec le contrat du paquet ;
- l’exclusion du manifeste de son propre inventaire est explicite ;
- les tailles et empreintes sont vérifiables ;
- la règle de tri est déterministe ;
- les propriétés inconnues et dupliquées sont rejetées ;
- la validation hors réseau est définie ;
- la canonicalisation est définie ;
- les preuves de compatibilité ne créent pas de promesse universelle ;
- les décisions différées sont visibles ;
- un gabarit représentatif peut être produit sans contradiction majeure ;
- le document est formaté et versionné.

## 50. Critères d’approbation

Le contrat peut passer à `APPROVED` lorsque :

- le propriétaire valide la structure générale ;
- les identifiants définitifs des modules initiaux sont décidés ;
- la politique de licence est décidée ;
- la liste initiale des capacités est décidée ;
- le schéma JSON Draft 2020-12 est créé ;
- le schéma interdit les propriétés supplémentaires ;
- un validateur rejette les propriétés dupliquées ;
- les validations métier complètent le schéma ;
- les limites sont confirmées techniquement ;
- la canonicalisation RFC 8785 est testée ;
- un manifeste valide représentatif est accepté ;
- les scénarios invalides obligatoires sont rejetés ;
- l’inventaire est réconcilié avec une archive réelle ;
- les tailles et empreintes sont vérifiées ;
- les trois modules initiaux peuvent utiliser le contrat sans contournement ;
- aucune décision différée bloquante ne subsiste.
