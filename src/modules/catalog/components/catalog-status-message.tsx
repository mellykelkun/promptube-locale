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
          ? "border border-[var(--danger)] bg-[#fff0f0] px-4 py-3 text-sm text-[var(--danger)]"
          : "border border-[var(--success)] bg-[#e9f2e3] px-4 py-3 text-sm text-[var(--success)]"
      }
    >
      {errorMessage ?? statusMessage}
    </p>
  );
}
