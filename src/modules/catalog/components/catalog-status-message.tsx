import { getCatalogErrorMessage } from "@/server/catalog/catalog-errors";

type CatalogStatusMessageProps = Readonly<{
  error?: string | null;
  status?: string | null;
}>;

const statusMessages: Record<string, string> = {
  approved: "Version approuvée localement.",
  archived: "Archivage effectué.",
  created: "Création effectuée.",
  restored: "Restauration effectuée.",
  returned: "Version remise en brouillon.",
  saved: "Modification enregistrée.",
  submitted: "Version soumise en revue.",
};

export function CatalogStatusMessage({ error, status }: CatalogStatusMessageProps) {
  const errorMessage = getCatalogErrorMessage(error);
  const statusMessage = status ? statusMessages[status] : null;

  if (!errorMessage && !statusMessage) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={
        errorMessage
          ? "rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
          : "rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
      }
    >
      {errorMessage ?? statusMessage}
    </p>
  );
}
