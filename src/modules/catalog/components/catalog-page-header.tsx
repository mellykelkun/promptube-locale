import Link from "next/link";

type CatalogPageHeaderProps = Readonly<{
  actionHref?: string;
  actionLabel?: string;
  eyebrow?: string;
  title: string;
  description: string;
}>;

export function CatalogPageHeader({
  actionHref,
  actionLabel,
  description,
  eyebrow = "Catalogue",
  title,
}: CatalogPageHeaderProps) {
  return (
    <div className="classic-window overflow-hidden">
      <div className="classic-titlebar px-3 py-1.5 text-sm">{eyebrow}</div>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--accent-blue)] uppercase">
            Catalogue local
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Link
            className="classic-button inline-flex items-center justify-center px-4 py-2 text-sm font-semibold"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
