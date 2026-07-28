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

const textareaClass = "min-h-72 px-3 py-2.5 font-mono text-sm";

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
          <span className="text-sm text-[var(--text-secondary)]">Révision {version.revision}</span>
          <Link
            className="classic-action inline-flex px-2 py-1 text-xs"
            href={`/catalog/modules/${id}`}
          >
            Retour au module
          </Link>
        </div>
        <CatalogStatusMessage
          error={paramValue(query, "error")}
          status={paramValue(query, "status")}
        />
        <form action={updateVersionAction} className="classic-panel grid gap-4 p-5">
          <input name="id" type="hidden" value={version.id} />
          <input name="moduleId" type="hidden" value={module.id} />
          <input name="expectedRevision" type="hidden" value={version.revision} />
          <label className="grid gap-2 text-sm text-[var(--text-primary)]">
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
          <label className="grid gap-2 text-sm text-[var(--text-primary)]">
            Changelog
            <textarea
              className="min-h-24 px-3 py-2.5 text-sm"
              defaultValue={version.changelog ?? ""}
              maxLength={2000}
              name="changelog"
              readOnly={!isDraft}
            />
          </label>
          <p className="text-sm text-[var(--text-secondary)]">
            Aperçu texte échappé uniquement. Aucun HTML utilisateur n’est exécuté.
          </p>
          <button
            className="classic-button px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
          <form action={createNextVersionAction} className="classic-panel p-5">
            <input name="id" type="hidden" value={version.id} />
            <input name="moduleId" type="hidden" value={module.id} />
            <button className="classic-button px-4 py-3 text-sm font-semibold" type="submit">
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
    <form action={action} className="classic-panel p-5">
      <input name="id" type="hidden" value={versionId} />
      <input name="moduleId" type="hidden" value={moduleId} />
      <input name="expectedRevision" type="hidden" value={revision} />
      <button
        className="classic-button w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}
