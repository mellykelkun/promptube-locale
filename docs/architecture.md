# Architecture de la fondation admin

## Portée

Cette architecture couvre uniquement le socle local Next.js. Elle n’autorise aucune connexion à la
production, base de données, cache, stockage, système de paiement ou fonctionnalité métier.

## Frontières internes

```text
src/app
   │ compose les pages et Route Handlers
   ├───────────────┐
   ▼               ▼
src/modules     src/shared
   │               │
   └──────┬────────┘
          ▼
      src/server
   accès serveur uniquement
```

- `app` assemble les routes Next.js ;
- `modules` porte les capacités fonctionnelles isolées ;
- `shared` contient uniquement les contrats et composants réutilisables ;
- `server` porte la configuration privée, les erreurs HTTP, la sécurité et l’observabilité.

Chaque module de `src/server` importe `server-only`. Les schémas partagés ne doivent jamais importer
la couche serveur.

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

Ces protections ne doivent pas être simulées avant que leurs contrats et leur infrastructure soient
approuvés.

## Tests

Vitest s’exécute avec jsdom. Les alias TypeScript sont résolus nativement par Vite. Un alias de test
neutralise uniquement le marqueur `server-only` afin de tester les fonctions serveur sans rendre ce
code importable par l’application cliente.

La couverture V8 est générée dans `coverage/` et n’est jamais versionnée.
