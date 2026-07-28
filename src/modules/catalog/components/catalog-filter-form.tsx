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
    <form className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-[1fr_auto_auto_auto]">
      <label className="grid gap-2 text-sm text-slate-200">
        Recherche
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
          defaultValue={defaultSearch}
          maxLength={120}
          name="search"
          placeholder="Nom, slug ou résumé"
          type="search"
        />
      </label>
      <label className="grid gap-2 text-sm text-slate-200">
        État
        <select
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
          defaultValue={defaultStatus}
          name="status"
        >
          <option value="active">Actifs</option>
          <option value="archived">Archivés</option>
          <option value="all">Tous</option>
        </select>
      </label>
      {showWorkflow ? (
        <label className="grid gap-2 text-sm text-slate-200">
          Workflow
          <select
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
            defaultValue={workflowStatus}
            name="workflowStatus"
          >
            <option value="">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="IN_REVIEW">En revue</option>
            <option value="APPROVED">Approuvé localement</option>
            <option value="SUPERSEDED">Remplacé</option>
          </select>
        </label>
      ) : null}
      <button
        className="self-end rounded-lg border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        type="submit"
      >
        Filtrer
      </button>
    </form>
  );
}
