# Paquets de modules locaux

Ce document décrit uniquement la chaîne locale de validation et de construction des paquets de
modules Promptube. Les paquets restent des préversions privées internes. Les contrats paquet,
manifeste et Markdown restent au statut `DRAFT`.

## Périmètre

La branche ajoute une fondation serveur isolée pour produire des archives ZIP privées à partir de
sources versionnées dans `private-modules/`. Elle n’ajoute pas de route applicative, upload,
stockage objet métier, migration, paiement, publication commerciale ou intégration production.

Les sources initiales couvrent le bundle « Concevoir, construire, vérifier » :

- `private-modules/developpement-logiciel/architecte-projet-logiciel`
- `private-modules/developpement-logiciel/developpeur-methodique`
- `private-modules/developpement-logiciel/auditeur-preparation-livraison`

Chaque module contient `promptube-module.json`, `README.md`, `instructions/`, `rules/`, `workflows/`
et une documentation complémentaire.

## Commandes

Valider un dossier source :

```bash
npm run modules:validate -- private-modules/developpement-logiciel/architecte-projet-logiciel
```

Construire un module :

```bash
npm run modules:build -- private-modules/developpement-logiciel/architecte-projet-logiciel
```

Construire les trois modules initiaux :

```bash
npm run modules:build:all
```

Contrôler les sources et les archives construites :

```bash
npm run modules:check
```

Les archives ZIP sont générées dans `artifacts/modules/`. Ce dossier est ignoré par Git. Les
archives ne doivent pas être committées.

## Garanties locales

Le runtime de paquet :

- refuse les chemins absolus, traversants, ambigus, Windows réservés, avec backslash ou collision de
  casse ;
- refuse les fichiers cachés, vides, spéciaux, liens symboliques, répertoires ZIP explicites et
  entrées hors structure autorisée ;
- applique les limites contractuelles de taille compressée, taille décompressée, taille par fichier,
  nombre de fichiers, profondeur, longueur de chemin et ratio de compression ;
- valide le manifeste en UTF-8 sans BOM, sans propriété dupliquée, avec Ajv Draft 2020-12 en mode
  strict ;
- vérifie l’inventaire complet, l’ordre déterministe, les tailles exactes et les SHA-256 ;
- valide tous les Markdown par l’API publique `validateSecureMarkdown`, sans parser Markdown
  parallèle et sans accès réseau ;
- construit des ZIP reproductibles avec ordre stable, permissions et dates normalisées.

## Différés

Cette fondation ne décide pas encore de la politique commerciale définitive, ne publie pas les
paquets et ne les connecte pas au catalogue administrable. L’intégration à une prévisualisation
serveur ou client devra être réalisée sur une branche séparée après audit de cette chaîne locale.
