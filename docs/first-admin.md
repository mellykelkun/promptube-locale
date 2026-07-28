# Création du premier administrateur

Le compte personnel du propriétaire ne doit pas être créé automatiquement par Codex ni par les
tests.

Préparer d’abord l’exploitation locale :

```bash
npm run docker:secrets:init
npm run docker:up
npm run db:provision
npm run db:migrate
npm run backup:create
npm run backup:verify
npm run backup:restore:test
```

Créer ensuite manuellement le premier administrateur :

```bash
npm run admin:bootstrap
```

La commande est interactive, ne prend jamais le mot de passe en argument, refuse un second premier
administrateur et ne crée aucune session automatique.

Après connexion, activer le TOTP via `/setup-2fa`, sauvegarder les codes de secours affichés une
seule fois, puis vérifier l’accès au dashboard et à l’audit.
