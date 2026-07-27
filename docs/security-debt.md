# Registre de dette de sécurité

## Cadre

- **Dernière vérification :** 2026-07-27
- **Responsable du suivi :** propriétaire du projet Promptube
- **Commandes de référence :** `npm run audit` et `npm run audit:prod`
- **État :** avis ouverts, non corrigés et non masqués

Les audits restent séparés de `npm run check` parce que les avis ci-dessous provoquent un code de
sortie non nul sans correction stable compatible. Cette séparation ne vaut ni correction ni
acceptation définitive du risque. Aucun `audit fix`, override transitif, paquet canary ou
rétrogradation n’est autorisé pour les contourner.

## Dépendances de production

### `sharp` 0.34.5 — GHSA-f88m-g3jw-g9cj

- **Introduction :** dépendance optionnelle transitive de `next@16.2.12`
  (`next@16.2.12 → sharp@0.34.5`).
- **Plage affectée / version corrigée connue :** `<0.35.0` / `0.35.0`.
- **Exposition actuelle :** faible mais non nulle. Le socle n’importe pas `sharp`, n’utilise pas
  `next/image`, ne propose aucun téléversement et ne traite aucune image non fiable.
- **Exposition future :** forte dès qu’une optimisation, conversion, miniature ou validation d’image
  fournie par un utilisateur est ajoutée.
- **Mesures compensatoires :** conserver l’absence de traitement d’images non fiables ; limiter le
  socle à ses ressources statiques contrôlées ; vérifier l’arbre npm à chaque mise à jour Next.js.
- **Blocage production :** aucun déploiement de fonctionnalité de traitement d’images n’est autorisé
  tant qu’une version corrigée ou une mitigation explicitement validée n’est pas en place.
- **Blocage images non fiables :** aucun traitement d’image non fiable n’est autorisé tant que cette
  version affectée est utilisée. Aucune fonction d’upload d’image ne doit être considérée prête pour
  la production avant correction ou mitigation validée.
- **Stratégie de mise à jour :** adopter la première version stable compatible de Next.js qui résout
  `sharp` vers `>=0.35.0`, puis réinstaller avec npm et rejouer tous les contrôles.
- **Référence vérifiée :**
  [GitHub Advisory Database](https://github.com/advisories/GHSA-f88m-g3jw-g9cj).

### `postcss` 8.4.31 — GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q et GHSA-r28c-9q8g-f849

- **Introduction :** dépendance transitive de `next@16.2.12` (`next@16.2.12 → postcss@8.4.31`). Le
  `postcss@8.5.23` utilisé séparément par Tailwind et Vite n’est pas affecté par ces plages.
- **Plages affectées / versions corrigées connues :** `<8.5.10` / `8.5.10`, `<=8.5.11` / `8.5.12`,
  et `<=8.5.17` / `8.5.18`.
- **Exposition actuelle :** Promptube ne traite actuellement aucun CSS fourni par un utilisateur. Le
  build transforme uniquement le CSS contrôlé et versionné du dépôt. Cette limitation réduit
  l’exposition, mais ne corrige pas la dépendance affectée.
- **Exposition future :** forte si des thèmes, styles, plugins ou fichiers CSS non fiables sont
  acceptés et traités, en particulier avec des source maps ou une réinjection dans une page.
- **Mesures compensatoires :** interdire tout CSS utilisateur ; ne traiter que les sources du dépôt
  ; ne pas exposer un service de transformation CSS ; vérifier l’arbre npm à chaque mise à jour.
- **Blocage production :** tout traitement de CSS non fiable ou toute fonction de thème
  personnalisable bloque une mise en production tant que le PostCSS transitif n’est pas corrigé.
- **Stratégie de mise à jour :** adopter la première version stable compatible de Next.js qui
  embarque `postcss>=8.5.18`, puis rejouer audit, tests et build. Aucun override transitif ne sera
  ajouté sans validation dédiée.
- **Références vérifiées :**
  [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93),
  [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) et
  [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849).

## Dépendances de développement

### `brace-expansion` 1.1.16 — GHSA-mh99-v99m-4gvg

- **Introduction :** dépendance transitive de `minimatch@3.1.5`, elle-même utilisée par
  `eslint@9.39.5` et les plugins de `eslint-config-next@16.2.12`.
- **Plage affectée / version corrigée connue :** `<=5.0.7` / `5.0.8`.
- **Exposition actuelle :** développement uniquement. Les motifs analysés par ESLint proviennent du
  projet ; aucune entrée utilisateur non fiable n’est transmise à `minimatch`.
- **Exposition future :** accrue si l’outillage devient un service ou accepte des motifs de fichiers
  construits à partir d’entrées non fiables.
- **Mesures compensatoires :** exécuter ESLint uniquement sur le dépôt contrôlé ; ne pas exposer ses
  motifs à des utilisateurs ; maintenir les limites de ressources de l’environnement de contrôle.
- **Blocage production :** aucun impact runtime direct ; une chaîne CI ou de livraison exposant des
  motifs non fiables doit être corrigée avant usage.
- **Stratégie de mise à jour :** attendre une mise à jour stable compatible d’ESLint et de
  `eslint-config-next`. Les corrections proposées actuellement impliquent un changement majeur ou
  une rétrogradation incompatible et ne sont pas appliquées.
- **Référence vérifiée :**
  [GitHub Advisory Database](https://github.com/advisories/GHSA-mh99-v99m-4gvg).

## Critères de réévaluation

Le registre doit être revu :

1. à chaque version stable de Next.js, ESLint ou `eslint-config-next` ;
2. avant toute exposition de l’admin hors d’un poste local ;
3. avant toute fonctionnalité d’upload ou de traitement d’image ;
4. avant tout traitement de CSS, thème ou plugin fourni par un utilisateur ;
5. avant toute livraison, même si les audits ne font pas partie de `npm run check`.
