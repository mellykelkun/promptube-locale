import type { CatalogWorkflowStatus } from "@/server/catalog/catalog-types";

type CatalogBadgeProps = Readonly<{
  archivedAt?: Date | null;
  status?: CatalogWorkflowStatus | null;
}>;

const workflowLabels: Record<CatalogWorkflowStatus, string> = {
  APPROVED: "Approuvé localement",
  DRAFT: "Brouillon",
  IN_REVIEW: "En revue",
  SUPERSEDED: "Remplacé",
};

export function CatalogBadge({ archivedAt, status }: CatalogBadgeProps) {
  const label = archivedAt ? "Archivé" : status ? workflowLabels[status] : "Actif";
  const tone =
    archivedAt || status === "SUPERSEDED"
      ? "border-[var(--border-medium)] bg-[#e4e4e4] text-[var(--text-secondary)]"
      : status === "APPROVED"
        ? "border-[var(--success)] bg-[#e9f2e3] text-[var(--success)]"
        : status === "IN_REVIEW"
          ? "border-[var(--warning)] bg-[#fff4c2] text-[var(--warning)]"
          : "border-[var(--accent-blue)] bg-[#e7effb] text-[var(--accent-blue)]";

  return (
    <span className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
  );
}
