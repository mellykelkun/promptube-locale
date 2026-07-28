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
      <p className="mb-2 border-b border-[var(--border-medium)] px-2 pb-1 text-xs font-semibold tracking-[0.12em] text-[var(--text-secondary)] uppercase">
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
                    "flex min-h-9 items-center justify-between border px-2.5 py-2 text-sm font-medium",
                    isCurrent
                      ? "border-[var(--accent-blue)] bg-[var(--accent-blue)] text-white"
                      : "border-[var(--border-medium)] bg-[var(--panel-background)] text-[var(--text-primary)]",
                    "hover:bg-[#e7effb] focus-visible:outline-2 focus-visible:outline-offset-2",
                  )}
                  href={item.href}
                >
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="text-[0.65rem]">
                      ▣
                    </span>
                    {item.label}
                  </span>
                  {isCurrent ? (
                    <span aria-hidden="true" className="text-white">
                      ▶
                    </span>
                  ) : null}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex min-h-9 items-center justify-between border border-transparent bg-[#ddd9cf] px-2.5 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="text-[0.65rem]">
                      □
                    </span>
                    {item.label}
                  </span>
                  <span className="text-[0.625rem] font-semibold tracking-wide uppercase">
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
