import type { ReactNode } from "react";

/**
 * The frame of every RS Link page (LINK-SYSTEM.md section 14): the site's colours and fonts, but no clan name, logo, JonnyBot branding,
 * invites, ads or links into the clan site. Header: the plugin's name and what the page is for. Footer: privacy, the public source (once it
 * exists), a contact address (once there is one) and "not affiliated with Jagex or Discord". Phone width first.
 */
export function LinkShell({ base, source, contact, children }: { base: string; source: string | null; contact: string | null; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <a href={base} className="text-3xl font-bold tracking-tight text-gold">
          RS Link
        </a>
        <p className="mt-2 text-sm text-muted">Link your RuneScape name to Discord</p>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-10 space-y-2 border-t border-surface-border pt-4 text-center text-xs text-muted">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <a className="hover:text-foreground" href={`${base === "/" ? "" : base}/links`}>
            My links
          </a>
          <a className="hover:text-foreground" href={`${base === "/" ? "" : base}/privacy`}>
            Privacy
          </a>
          {source && (
            <a className="hover:text-foreground" href={source} rel="noopener noreferrer">
              Source code
            </a>
          )}
          {contact && (
            <a className="hover:text-foreground" href={`mailto:${contact}`}>
              Contact
            </a>
          )}
        </nav>
        <p>RS Link is a free community plugin. Not affiliated with Jagex or Discord.</p>
      </footer>
    </div>
  );
}

/** A plain panel for the steps. */
export function LinkPanel({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "warn" | "bad" }) {
  const border = tone === "good" ? "border-emerald-500/40" : tone === "warn" ? "border-amber-500/40" : tone === "bad" ? "border-red-500/40" : "border-surface-border";
  return <section className={`rounded-xl border ${border} bg-surface p-5 sm:p-6`}>{children}</section>;
}

export const linkButton = "inline-flex w-full items-center justify-center rounded-lg bg-gold px-4 py-3 text-base font-semibold text-background transition hover:brightness-110 disabled:opacity-50";
export const linkGhostButton = "inline-flex w-full items-center justify-center rounded-lg border border-surface-border px-4 py-3 text-base text-foreground transition hover:bg-white/5 disabled:opacity-50";
export const linkInput = "w-full rounded-lg border border-control-border bg-background px-4 py-3 text-center font-mono text-2xl tracking-[0.2em] uppercase outline-none focus:border-gold focus:ring-1 focus:ring-gold/50";
