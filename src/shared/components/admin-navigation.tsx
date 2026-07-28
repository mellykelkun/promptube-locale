import Link from "next/link";

import { ADMIN_NAVIGATION } from "@/shared/constants/navigation";
import { joinClassNames } from "@/shared/utilities/join-class-names";

type AdminNavigationProps = Readonly<{
  currentPath?: string;
}>;

function isCurrentNavigationItem(href: string, currentPath: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function AdminNavigation({ currentPath = "/" }: AdminNavigationProps) {
  return (
    <nav aria-label="Navigation principale">
      <p className="mb-3 px-3 text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
        Navigation
      </p>
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
        {ADMIN_NAVIGATION.map((item) => {
          const isCurrent =
            item.status === "active" && isCurrentNavigationItem(item.href, currentPath);

          return (
            <li key={item.label}>
              {item.status === "active" ? (
                <Link
                  aria-current={isCurrent ? "page" : undefined}
                  className={joinClassNames(
                    "flex min-h-11 items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium",
                    isCurrent
                      ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                      : "border-slate-800 bg-slate-900/60 text-slate-300",
                    "transition-colors hover:bg-cyan-400/15 focus-visible:outline-2",
                    "focus-visible:outline-offset-2 focus-visible:outline-cyan-300",
                  )}
                  href={item.href}
                >
                  <span>{item.label}</span>
                  {isCurrent ? (
                    <span aria-hidden="true" className="text-cyan-300">
                      ●
                    </span>
                  ) : null}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex min-h-11 items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm text-slate-400"
                >
                  <span>{item.label}</span>
                  <span className="text-[0.625rem] font-semibold tracking-wide text-slate-500 uppercase">
                    Bientôt
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
