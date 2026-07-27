"use client";

import "./globals.css";

import { ErrorState } from "@/shared/components/error-state";

type GlobalErrorProps = Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>;

export default function GlobalError({ unstable_retry }: GlobalErrorProps) {
  return (
    <html lang="fr">
      <body>
        <title>Erreur | Promptube Admin</title>
        <ErrorState
          message="L’application d’administration rencontre une erreur inattendue. Aucun détail technique sensible n’est exposé."
          onRetry={unstable_retry}
          title="Administration temporairement indisponible"
        />
      </body>
    </html>
  );
}
