"use client";

import { ErrorState } from "@/shared/components/error-state";

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>;

export default function ErrorPage({ unstable_retry }: ErrorPageProps) {
  return (
    <ErrorState
      message="Le contenu demandé n’a pas pu être affiché. Aucun détail technique sensible n’est exposé."
      onRetry={unstable_retry}
      title="Une erreur est survenue"
    />
  );
}
