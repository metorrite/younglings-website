import Link from "next/link";
import type { ReactNode } from "react";

/** The page-level building blocks shared by every clan page, so they all feel like one site. */

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-surface-border bg-surface/90 p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold tracking-wide text-gold uppercase">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <div className="h-full rounded-xl border border-surface-border bg-surface/90 p-4 transition hover:border-gold/40">
      <p className="text-xs tracking-wider text-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-wide text-gold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

/** Shown in place of a section when JonnyBot can't be reached — the rest of the page still renders. */
export function Unavailable({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-muted">
      {what} isn&apos;t available right now — JonnyBot can&apos;t be reached. Try again in a moment.
    </div>
  );
}

export function RankBadge({ rank, color }: { rank: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium" style={{ borderColor: `${color}66`, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {rank}
    </span>
  );
}

export function ProgressBar({ value, max, color = "#d4af37" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}
