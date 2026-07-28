import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveVersionAction,
  createNextVersionAction,
  returnVersionToDraftAction,
  submitVersionAction,
  updateVersionAction,
} from "@/app/catalog/actions";
import { requireCompletedTwoFactor } from "@/server/auth/session";
import { isCatalogError } from "@/server/catalog/catalog-errors";
import { getCatalogModuleVersion } from "@/server/catalog/catalog-service";
import { AdminShell } from "@/shared/components/admin-shell";
import { CatalogBadge } from "@/modules/catalog/components/catalog-badge";
import { CatalogPageHeader } from "@/modules/catalog/components/catalog-page-header";
import { CatalogStatusMessage } from "@/modules/catalog/components/catalog-status-message";

import {
  getCatalogSearchParams,
  paramValue,
  type CatalogSearchParams,
} from "../../../../page-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const textareaClass =
  "min-h-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300";

export default async function ModuleVersionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; versionId: string }>;
  searchParams?: CatalogSearchParams;
}) {
  const current = await requireCompletedTwoFactor();
  const { id, versionId } = await params;
  const query = await getCatalogSearchParams(searchParams);
  const { module, version } = await getCatalogModuleVersion(versionId).catch((error) => {
    if (isCatalogError(error)) {
      notFound();
    }
    throw error;
  });
  const isDraft = version.workflowStatus === "DRAFT";
  const isInReview = version.workflowStatus === "IN_REVIEW";
  const isApproved = version.workflowStatus === "APPROVED";

  return (
    <AdminShell admin={current.admin} currentPath="/catalog">
      <section className="space-y-8">
        <CatalogPageHeader
          description={`${module.title} · version ${version.versionNumber}. Le Markdown est stocké en texte et non rendu en HTML dans cette phase.`}
          title={`Version ${version.versionNumber}`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <CatalogBadge status={version.workflowStatus} />
          <span className="text-sm text-slate-400">Révision {version.revision}</span>
          <Link
            className="text-sm text-cyan-200 hover:text-cyan-100"
            href={`/catalog/modules/${id}`}
          >
            Retour au module
          </Link>
        </div>
        <CatalogStatusMessage
          error={paramValue(query, "error")}
          status={paramValue(query, "status")}
        />
        <form
          action={updateVersionAction}
          className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <input name="id" type="hidden" value={version.id} />
          <input name="moduleId" type="hidden" value={module.id} />
          <input name="expectedRevision" type="hidden" value={version.revision} />
          <label className="grid gap-2 text-sm text-slate-200">
            Contenu Markdown
            <textarea
              className={textareaClass}
              defaultValue={version.contentMarkdown}
              maxLength={50000}
              name="contentMarkdown"
              readOnly={!isDraft}
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            Changelog
            <textarea
              className="min-h-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-300"
              defaultValue={version.changelog ?? ""}
              maxLength={2000}
              name="changelog"
              readOnly={!isDraft}
            />
          </label>
          <p className="text-sm text-slate-400">
            Aperçu texte échappé uniquement. Aucun HTML utilisateur n’est exécuté.
          </p>
          <button
            className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isDraft}
            type="submit"
          >
            Enregistrer le brouillon
          </button>
        </form>
        <div className="grid gap-4 md:grid-cols-3">
          <TransitionForm
            action={submitVersionAction}
            disabled={!isDraft}
            label="Soumettre en revue"
            moduleId={module.id}
            revision={version.revision}
            versionId={version.id}
          />
          <TransitionForm
            action={returnVersionToDraftAction}
            disabled={!isInReview}
            label="Retour en brouillon"
            moduleId={module.id}
            revision={version.revision}
            versionId={version.id}
          />
          <TransitionForm
            action={approveVersionAction}
            disabled={!isInReview}
            label="Approuver localement"
            moduleId={module.id}
            revision={version.revision}
            versionId={version.id}
          />
        </div>
        {isApproved ? (
          <form
            action={createNextVersionAction}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
          >
            <input name="id" type="hidden" value={version.id} />
            <input name="moduleId" type="hidden" value={module.id} />
            <button
              className="rounded-lg border border-cyan-300/50 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              type="submit"
            >
              Créer la version suivante depuis cette version approuvée localement
            </button>
          </form>
        ) : null}
      </section>
    </AdminShell>
  );
}

function TransitionForm({
  action,
  disabled,
  label,
  moduleId,
  revision,
  versionId,
}: Readonly<{
  action: (formData: FormData) => Promise<void>;
  disabled: boolean;
  label: string;
  moduleId: string;
  revision: number;
  versionId: string;
}>) {
  return (
    <form action={action} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <input name="id" type="hidden" value={versionId} />
      <input name="moduleId" type="hidden" value={moduleId} />
      <input name="expectedRevision" type="hidden" value={revision} />
      <button
        className="w-full rounded-lg border border-cyan-300/50 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}
