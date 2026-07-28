# Registre de dette de sécurité

## Cadre

- **Dernière vérification :** 2026-07-28
- **Responsable du suivi :** propriétaire du projet Promptube
- **Commandes de référence :** `npm run audit` et `npm run audit:prod`
- **État :** avis ouverts, non corrigés et non masqués

Les audits restent séparés de `npm run check` parce que les avis ci-dessous provoquent un code de
sortie non nul sans correction stable compatible. Cette séparation ne vaut ni correction ni
acceptation définitive du risque. Aucun `audit fix`, override transitif, paquet canary ou
rétrogradation n’est autorisé pour les contourner.

`@playwright/test` est utilisé uniquement comme dépendance de développement pour l’environnement
isolé `promptube_admin_test`. Playwright et Chromium ne sont pas copiés dans l’image runtime Next.js
; toute vulnérabilité éventuelle de cet outillage doit être évaluée comme dette de test, pas comme
surface applicative exposée.

Les workflows de sauvegarde/restauration utilisent uniquement `node:crypto`, `pg_dump`,
`pg_restore`, Docker Compose et l’image PostgreSQL officielle déjà verrouillée. Ils n’ajoutent pas
de dépendance runtime ou npm de chiffrement. Toute vulnérabilité critique exploitable dans ces
outils bloque une restauration réelle jusqu’à réévaluation.

## Stockage objet local

### MinIO — GHSA-jjjj-jwhf-8rgr / CVE-2025-62506

- **Version antérieure :** `RELEASE.2025-09-07T16-13-09Z`, affectée.
- **Version locale retenue :** `RELEASE.2025-10-15T17-29-55Z`.
- **Source :** tag officiel résolu vers `9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a`; archive vérifiée
  par SHA-256 `45521908307306e925c98d629e1c17d78c8b72b6ee242b1bfb1409f7d8ee5841`.
- **Correction connue :** le correctif de l’avis est intégré à cette release de sécurité. L’ancienne
  release n’est plus référencée ni exécutée par la stack.
- **Exposition actuelle :** stockage local non publié sur l’hôte, sans bucket ou donnée métier.
- **Limite :** la correction de cet avis ne signifie pas que toutes les vulnérabilités de l’image ou
  du produit sont résolues. Le dépôt officiel est archivé et publié comme source uniquement.
- **Mesures compensatoires :** réseau backend interne, utilisateur non-root, racine en lecture
  seule, capabilities supprimées, secret par fichier, aucun upload métier et aucune exposition
  externe.
- **Blocage production :** MinIO n’est pas approuvé comme stockage de production. Un moteur S3
  activement maintenu, son plan de migration et une revue de sécurité sont obligatoires avant toute
  production.
- **Stratégie :** conserver le tag, le commit, l’archive et les images de base verrouillés ; suivre
  les avis ; remplacer le moteur avant production plutôt que poursuivre une dépendance archivée.
- **Référence vérifiée :**
  [avis officiel MinIO](https://github.com/minio/minio/security/advisories/GHSA-jjjj-jwhf-8rgr).

## Scan des images locales

Le 28 juillet 2026, les cinq images runtime ont été analysées avec l’image officielle
`aquasec/trivy:0.71.2`, verrouillée par le digest
`sha256:f5d0e600ecda7449e2a9b272805aef698631d3bb3f3a739a750de2c6819acdc9`. Chaque image a été
exportée dans une archive temporaire ; le scanner n’a reçu ni socket Docker, ni secret, ni accès au
dépôt. La base de vulnérabilités v2 datait du 27 juillet 2026 à 19:20:18 UTC. Archives, rapports et
cache temporaires ont été supprimés après synthèse.

| Image               | Critical | High | Décision locale                                               |
| ------------------- | -------- | ---- | ------------------------------------------------------------- |
| Application Next.js | 0        | 1    | `sharp` déjà suivi ; aucun traitement d’image autorisé        |
| Outils DB/bootstrap | 0        | 3    | `sharp`/`postcss` déjà suivis ; image one-shot locale         |
| Reverse proxy       | 0        | 0    | Nginx 1.31.3 / Alpine 3.24 retenu après remédiation           |
| Stockage objet      | 1        | 22   | non exploitable dans le périmètre actuel ; production bloquée |
| PostgreSQL          | 1        | 17   | avis portés par le bootstrap `gosu` ; production à réévaluer  |
| Redis               | 0        | 0    | aucun avis high ou critical détecté                           |

### Avis critique gRPC dans le binaire MinIO

- **Identifiant :** CVE-2026-33186.
- **Paquet :** `google.golang.org/grpc` 1.72.0 ; correction connue en 1.79.3.
- **Condition d’exploitation :** serveur gRPC utilisant une autorisation fondée sur le chemin avec
  des règles deny canoniques et une règle allow de repli.
- **Exposition actuelle :** MinIO n’ouvre dans cette stack que ses interfaces HTTP S3 et console sur
  9000/9001, dans le backend interne, sans listener gRPC, sans règle RBAC gRPC et sans port hôte.
  Les conditions de l’avis ne sont donc pas présentes.
- **Décision :** non bloquant pour cette validation locale uniquement. Toute exposition, donnée
  métier, connexion à un client non fiable ou production reste bloquée.
- **Correction non appliquée :** une surcharge de module aurait modifié le graphe du tag officiel
  sans suite de compatibilité MinIO maintenue. Aucun override transitif non validé n’est introduit.
- **Référence vérifiée :** [NVD CVE-2026-33186](https://nvd.nist.gov/vuln/detail/CVE-2026-33186).

Les 22 avis high du binaire MinIO concernent les versions embarquées de `golang.org/x/crypto`
0.37.0, `golang.org/x/net` 0.39.0, `go.opentelemetry.io/otel/sdk` 1.35.0,
`github.com/buger/jsonparser` 1.1.1, `github.com/go-jose/go-jose/v4` 4.1.0,
`github.com/apache/thrift` 0.21.0, `github.com/prometheus/prometheus` 0.303.0 et
`google.golang.org/grpc` 1.72.0. Des versions corrigées sont connues, mais leur application isolée
constituerait une divergence non validée du code MinIO archivé. Elles renforcent l’obligation de
remplacer MinIO avant la production.

### Avis critique Go dans l’image PostgreSQL

- **Identifiant :** CVE-2025-68121.
- **Paquet :** bibliothèque standard Go 1.24.6 intégrée à `/usr/local/bin/gosu`; correction connue
  en Go 1.24.13.
- **Condition d’exploitation :** reprise de session TLS dans une application utilisant les
  configurations TLS concernées.
- **Exposition actuelle :** `gosu` est l’outil local, sans listener réseau, qui abandonne les
  privilèges pendant le bootstrap PostgreSQL avec des arguments constants contrôlés par l’image. Le
  processus final est PostgreSQL sous son utilisateur dédié ; les conditions TLS de l’avis ne sont
  pas présentes dans `gosu`.
- **Décision :** non bloquant pour l’environnement local non publié. Une image PostgreSQL officielle
  rescannée sans cet avis est requise avant toute production.

Les 17 avis high PostgreSQL sont majoritairement associés à la même bibliothèque standard de `gosu`;
les autres concernent `c-ares` et `libcurl` de l’image Alpine. L’image officielle est verrouillée,
PostgreSQL n’est pas publié sur l’hôte et l’application utilise uniquement un compte runtime non
superutilisateur avec privilèges limités. Ces mesures réduisent l’exposition sans résoudre les avis.

### Limites du scan

Trivy réalise une analyse de présence de paquets, pas une preuve de joignabilité de chaque fonction
vulnérable. Le verdict d’exploitabilité ci-dessus dépend donc aussi des listeners, usages et
frontières runtime vérifiés. Inversement, zéro résultat ne prouve pas l’absence de vulnérabilité. Un
nouveau scan est obligatoire avant toute exposition, mise à jour d’image ou projet de production.

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

### `postcss` 8.4.31 — GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q / CVE-2026-45623 et GHSA-r28c-9q8g-f849

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

### `esbuild` 0.18.20 — GHSA-67mh-4wv8-2f99

- **Introduction :** dépendance transitive de `drizzle-kit@0.31.10` via `@esbuild-kit/esm-loader` et
  `@esbuild-kit/core-utils`.
- **Plage affectée / correction proposée :** `<=0.24.2`. `npm audit fix --force` propose
  `drizzle-kit@0.18.1`, ce qui est une rétrogradation incompatible et n’est pas appliqué.
- **Exposition actuelle :** outillage local de migration/génération uniquement. Aucun serveur de
  développement `esbuild` n’est exposé par l’application ou par Docker.
- **Exposition future :** accrue si un outil de développement basé sur `esbuild` est exposé à un
  navigateur ou à un réseau non fiable.
- **Mesures compensatoires :** ne pas exposer les outils Drizzle ; utiliser `db:generate`,
  `db:migrate` et `db:status` comme commandes locales explicites ; conserver les audits séparés de
  `check` tant que l’avis reste ouvert.
- **Blocage production :** non bloquant pour le runtime local actuel. Une chaîne CI distante ou un
  service de migration exposé doit utiliser une version corrigée.
- **Stratégie de mise à jour :** adopter une version stable compatible de Drizzle Kit qui ne tire
  plus cette chaîne affectée, puis rejouer audits, migrations sur base vide et build Docker.
- **Référence vérifiée :**
  [GitHub Advisory Database](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

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
