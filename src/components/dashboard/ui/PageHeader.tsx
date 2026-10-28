import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The top of every dashboard page: what it is, one line on what it is for, and optionally buttons on the right. A page inside another (one event inside the
 * event list, a draft being set up) gives `back` and gets a button above the title that goes back up a level, so nobody has to find their way out by the sidebar.
 */
export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="space-y-3 border-b border-surface-border pb-5">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-sm text-muted transition hover:border-gold hover:text-foreground"
        >
          <span aria-hidden>←</span>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
