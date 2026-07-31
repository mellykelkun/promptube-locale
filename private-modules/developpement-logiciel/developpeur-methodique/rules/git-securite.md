# Règles Git et sécurité

- Inspecter `pwd`, la racine Git, la branche et l’état court.
- Travailler sur une branche adaptée.
- Ne jamais réécrire l’historique sans autorisation explicite.
- Ne jamais stage un fichier hors périmètre.
- Ne jamais committer un secret, un artefact temporaire ou une archive générée.
- Vérifier le diff avant commit.
- Préférer un commit ciblé à un mélange de changements.
- Documenter la commande de rollback.

Une divergence distante ou un worktree inattendu doit bloquer la publication jusqu’au diagnostic.
