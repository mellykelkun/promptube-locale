type CatalogFilterFormProps = Readonly<{
  defaultSearch?: string;
  defaultStatus?: string;
  showWorkflow?: boolean;
  workflowStatus?: string;
}>;

export function CatalogFilterForm({
  defaultSearch = "",
  defaultStatus = "active",
  showWorkflow = false,
  workflowStatus = "",
}: CatalogFilterFormProps) {
  return (
    <form className="classic-panel grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto]">
      <label className="grid gap-2 text-sm text-[var(--text-primary)]">
        Recherche
        <input
          className="px-3 py-2 text-sm"
          defaultValue={defaultSearch}
          maxLength={120}
          name="search"
          placeholder="Nom, slug ou résumé"
          type="search"
        />
      </label>
      <label className="grid gap-2 text-sm text-[var(--text-primary)]">
        État
        <select className="px-3 py-2 text-sm" defaultValue={defaultStatus} name="status">
          <option value="active">Actifs</option>
          <option value="archived">Archivés</option>
          <option value="all">Tous</option>
        </select>
      </label>
      {showWorkflow ? (
        <label className="grid gap-2 text-sm text-[var(--text-primary)]">
          Workflow
          <select className="px-3 py-2 text-sm" defaultValue={workflowStatus} name="workflowStatus">
            <option value="">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="IN_REVIEW">En revue</option>
            <option value="APPROVED">Approuvé localement</option>
            <option value="SUPERSEDED">Remplacé</option>
          </select>
        </label>
      ) : null}
      <button className="classic-button self-end px-4 py-2 text-sm font-semibold" type="submit">
        Filtrer
      </button>
    </form>
  );
}
