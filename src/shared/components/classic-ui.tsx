import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { joinClassNames } from "@/shared/utilities/join-class-names";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;
type InputProps = ComponentPropsWithoutRef<"input">;
type SelectProps = ComponentPropsWithoutRef<"select">;
type TableProps = ComponentPropsWithoutRef<"table">;
type FieldsetProps = ComponentPropsWithoutRef<"fieldset">;

type WindowPanelProps = DivProps &
  Readonly<{
    title?: string;
    toolbar?: ReactNode;
    status?: ReactNode;
  }>;

export function WindowPanel({
  children,
  className,
  status,
  title,
  toolbar,
  ...props
}: WindowPanelProps) {
  return (
    <section className={joinClassNames("classic-window overflow-hidden", className)} {...props}>
      {title ? <TitleBar>{title}</TitleBar> : null}
      {toolbar ? <Toolbar>{toolbar}</Toolbar> : null}
      <div className="p-4">{children}</div>
      {status ? <StatusBar>{status}</StatusBar> : null}
    </section>
  );
}

export function TitleBar({ children, className, ...props }: DivProps) {
  return (
    <div className={joinClassNames("classic-titlebar px-3 py-1.5 text-sm", className)} {...props}>
      {children}
    </div>
  );
}

export function Toolbar({ children, className, ...props }: DivProps) {
  return (
    <div
      className={joinClassNames(
        "classic-toolbar flex flex-wrap items-center gap-2 px-3 py-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatusBar({ children, className, ...props }: DivProps) {
  return (
    <div className={joinClassNames("classic-statusbar px-3 py-1.5 text-xs", className)} {...props}>
      {children}
    </div>
  );
}

export function ClassicButton({ className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={joinClassNames(
        "classic-button inline-flex items-center justify-center px-3 py-2 text-sm",
        className,
      )}
      type={type}
      {...props}
    />
  );
}

export function ClassicInput({ className, ...props }: InputProps) {
  return <input className={joinClassNames("px-3 py-2 text-sm", className)} {...props} />;
}

export function ClassicSelect({ className, ...props }: SelectProps) {
  return <select className={joinClassNames("px-3 py-2 text-sm", className)} {...props} />;
}

export function ClassicTable({ className, ...props }: TableProps) {
  return (
    <table
      className={joinClassNames("classic-table w-full text-left text-sm", className)}
      {...props}
    />
  );
}

export function FieldGroup({ children, className, ...props }: FieldsetProps) {
  return (
    <fieldset className={joinClassNames("classic-panel grid gap-3 p-4", className)} {...props}>
      {children}
    </fieldset>
  );
}

export function Dialog({ children, className, ...props }: DivProps) {
  return (
    <div
      className={joinClassNames(
        "classic-window max-w-lg border border-[var(--border-dark)] bg-[var(--window-background)]",
        className,
      )}
      role="dialog"
      {...props}
    >
      {children}
    </div>
  );
}

type TabsProps = DivProps &
  Readonly<{
    tabs: readonly string[];
  }>;

export function Tabs({ className, tabs, ...props }: TabsProps) {
  return (
    <div
      className={joinClassNames(
        "flex flex-wrap items-end gap-1 border-b border-[var(--border-medium)]",
        className,
      )}
      {...props}
    >
      {tabs.map((tab, index) => (
        <span
          aria-current={index === 0 ? "page" : undefined}
          className={joinClassNames(
            "border border-[var(--border-medium)] border-b-0 px-3 py-1.5 text-xs font-semibold",
            index === 0
              ? "bg-[var(--panel-background)] text-[var(--text-primary)]"
              : "bg-[var(--accent-beige)] text-[var(--text-secondary)]",
          )}
          key={tab}
        >
          {tab}
        </span>
      ))}
    </div>
  );
}
