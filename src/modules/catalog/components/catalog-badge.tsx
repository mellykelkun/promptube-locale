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
      ? "border-slate-500/40 bg-slate-500/10 text-slate-200"
      : status === "APPROVED"
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
        : status === "IN_REVIEW"
          ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
          : "border-cyan-300/40 bg-cyan-300/10 text-cyan-100";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}
