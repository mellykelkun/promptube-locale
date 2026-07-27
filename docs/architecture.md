# Architecture de la fondation admin

## Portée

Cette architecture couvre le socle local Next.js et ses services d’infrastructure isolés. Elle
n’autorise aucune connexion à la production, migration, donnée métier, système de paiement ou
fonctionnalité métier. PostgreSQL, Redis et le stockage objet sont initialisés vides et ne sont pas
encore utilisés par le code applicatif.

## Frontières internes

```text
src/app ───────────────▶ src/modules ─────▶ src/shared
  │                           │
  ├───────────────────────────┘
  └── Route Handlers et
      Server Components ─────▶ src/server ─────▶ src/shared
```

- `app` assemble les routes Next.js ;
- `modules` porte les capacités fonctionnelles isolées ;
- `shared` contient uniquement les contrats et composants réutilisables ;
- `server` porte la configuration privée, les erreurs HTTP, la sécurité et l’observabilité.

Chaque module de `src/server` importe `server-only`. Les schémas partagés ne doivent jamais importer
la couche serveur. Les Client Components ne peuvent importer que des éléments compatibles avec le
navigateur depuis `modules` ou `shared`.

## Frontières Docker

```text
127.0.0.1:8080
       │
       ▼
admin-promptube-reverse-proxy ── frontend ── admin-promptube-app
                                                   │
                                           backend interne
                              ┌────────────────────┼────────────────────┐
                              ▼                    ▼                    ▼
                 admin-promptube-postgres  admin-promptube-redis  admin-promptube-object-storage
```

- `promptube_admin_frontend` relie uniquement le proxy et l’application ;
- `promptube_admin_backend` est interne et relie l’application aux trois services de données ;
- seul le proxy publie `127.0.0.1:8080` ;
- les trois volumes sont propres au projet Compose `promptube_admin` ;
- les secrets sont des fichiers locaux ignorés, montés en lecture seule ;
- aucun réseau, volume, secret ou service de `promptube-prod` n’est référencé.

La présence du réseau backend ne constitue pas une connexion applicative : aucune variable de
connexion ou bibliothèque cliente n’est ajoutée dans cette phase.

## Configuration

La configuration est séparée en deux entrées :

- `src/server/config/environment.ts` valide les métadonnées serveur ;
- `src/shared/config/public-environment.ts` expose uniquement les variables préfixées
  `NEXT_PUBLIC_`.

Zod valide les valeurs à l’import de la couche concernée. Les messages d’échec indiquent le champ
invalide, jamais sa valeur.

Il n’existe aucune variable obligatoire propre au projet dans cette phase. Les valeurs utilisées ont
des replis déterministes ; toute surcharge fournie doit être valide.

## Requête healthcheck

```text
GET /api/health
  → création ou validation de la corrélation
  → rejet de tout paramètre inattendu
  → lecture de métadonnées validées
  → log structuré sans secret
  → réponse JSON non sensible et no-store
```

Les erreurs attendues deviennent des `AppError` typées. Toute erreur inattendue est convertie en
`INTERNAL_ERROR` avec un message public générique. Aucune stack trace n’est sérialisée.

## Journalisation

Le logger natif produit une ligne JSON par événement avec :

- `level` ;
- `message` ;
- `timestamp` ISO 8601 ;
- `correlationId` si disponible ;
- `context` nettoyé ;
- erreur normalisée.

Les clés correspondant aux mots de passe, jetons, cookies, secrets, autorisations, sessions,
identifiants ou clés privées/API sont remplacées par `[REDACTED]`. Les erreurs inattendues ne
publient pas leur message ni leur stack. Les appelants doivent néanmoins fournir des messages
constants et ne jamais interpoler de donnée sensible.

## Sécurité active

- `poweredByHeader: false` ;
- protection contre le MIME sniffing ;
- interdiction d’intégration en frame ;
- politique de référent stricte ;
- désactivation des capacités navigateur inutiles ;
- DNS prefetch désactivé ;
- frontière serveur vérifiée par Next.js ;
- validation du healthcheck ;
- réponses d’erreur et logs sans détails sensibles.

## Protections différées

- CSP : à définir avec l’interface et ses ressources finales ;
- HSTS : à appliquer seulement derrière le proxy HTTPS validé ;
- authentification, MFA, sessions, cookies et CSRF ;
- RBAC et audit métier ;
- rate limiting ;
- CORS privé et canal admin vers production ;
- télémétrie et agrégation de logs externes.
- sauvegarde automatisée et test périodique de restauration des trois volumes.

Ces protections ne doivent pas être simulées avant que leurs contrats et leur infrastructure soient
approuvés.

## Tests

Vitest s’exécute avec jsdom. Les alias TypeScript sont résolus nativement par Vite. Un alias de test
neutralise uniquement le marqueur `server-only` afin de tester les fonctions serveur sans rendre ce
code importable par l’application cliente.

La couverture V8 est générée dans `coverage/` et n’est jamais versionnée. Les seuils minimaux sont
80 % pour les statements, lignes et fonctions, et 65 % pour les branches.
