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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.16em] text-cyan-300 uppercase">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link
          className="inline-flex items-center justify-center rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
