<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontières Git de l’administration locale

- Ce projet est un dépôt Git indépendant de `promptube-prod`.
- Un remote Git peut être configuré uniquement après décision explicite du propriétaire.
- Ne jamais créer de `.git` à la racine de `Promptube-Archtecture`.
- Ne jamais ajouter ce projet au dépôt `promptube-prod`.
- Utiliser uniquement `main`, `develop`, `feature/*`, `fix/*`, `chore/*` et
  `security/*`.
- Effectuer les fusions localement avant tout push.
- Ne jamais ajouter, modifier ou supprimer un remote sans demande explicite.
- Ne jamais pousser sans demande explicite du propriétaire et sans contrôles locaux réussis.
- Exécuter toute initialisation, création de branche ou commit uniquement dans
  une micro-étape explicitement autorisée.
- Git remplace les snapshots systématiques du code, mais pas les sauvegardes
  des bases, volumes, fichiers téléversés ou secrets.
