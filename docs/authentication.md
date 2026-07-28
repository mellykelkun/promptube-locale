# Authentification administrateur locale

## Portée

L’authentification sert uniquement l’administration locale Promptube. Elle ne crée aucun utilisateur
client, fournisseur OAuth, magic link, reset email ou accès production.

## Better Auth

- endpoint App Router officiel : `/api/auth/[...all]` ;
- email et mot de passe activés ;
- inscription publique désactivée ;
- télémétrie désactivée ;
- origines de confiance limitées à la configuration locale ;
- secret Better Auth lu depuis `secrets/better-auth-secret` via Docker secret ;
- sessions stockées dans PostgreSQL et révocables ;
- Redis utilisé pour la limitation de tentatives.

En local HTTP, les cookies ne peuvent pas exiger `Secure`. Cette exception dépend de
`APP_ENV=local`. Tout autre environnement doit utiliser HTTPS et cookies `Secure`.

## Mots de passe

La politique accepte les phrases de passe de 14 à 128 caractères, sans règle de composition
artificielle. Les mots de passe ne sont jamais tronqués, journalisés, passés en argument ou stockés
en clair.

Le hachage utilise Argon2id via `@node-rs/argon2` :

- mémoire : 64 MiB ;
- itérations : 3 ;
- parallélisme : 1 ;
- sel unique géré par la bibliothèque ;
- hash encodé avec paramètres.

## Premier administrateur

Le premier administrateur est créé manuellement par le propriétaire :

```bash
npm run docker:up
npm run db:provision
npm run db:migrate
npm run admin:bootstrap
```

La commande est interactive et refuse de créer un second premier administrateur. Elle ne crée aucune
session automatique.

## TOTP obligatoire

Après connexion par mot de passe, un administrateur sans TOTP est redirigé vers `/setup-2fa`. Il ne
peut pas accéder au dashboard ni à `/audit` tant que le code TOTP initial n’est pas validé.

Les trusted devices sont désactivés. Les secrets TOTP, URI TOTP et codes de secours ne doivent
jamais être journalisés ni copiés dans un rapport. Les codes de secours ne sont affichés qu’une fois
pendant l’activation.

## Protection des routes

`proxy.ts` effectue uniquement des redirections optimistes selon la présence du cookie. La
protection réelle est répétée côté serveur dans la DAL :

- session présente ;
- session non expirée ;
- utilisateur actif ;
- rôle `admin` ;
- TOTP activé pour les pages protégées.

Routes publiques : `/login`, `/api/auth/*`, `/api/health`, `/api/health/live`, `/api/health/ready`
et ressources statiques. Routes protégées : dashboard, audit et futures sections admin.
