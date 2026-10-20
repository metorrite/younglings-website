import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ReportClan } from "@/components/clanshub/ReportClan";
import { cssVariables } from "@/lib/clanSiteTheme";
import type { SiteContext } from "@/lib/clanSitePage";
import { SiteNav } from "./SiteNav";

/**
 * A clan website's frame in its template: Classic (dark, logo and name left, menu right), Hall (dark stone, the name centred over the banner),
 * Minimal (light, a plain top bar). Colours and font come from the clan's theme as CSS variables; the pages only use those.
 * Every site's footer says it is made with JonnyBot and has the Report link (design B2: reports go to the bot owner's queue).
 */
export function SiteShell({ ctx, children }: { ctx: SiteContext; children: ReactNode }) {
  const { site, template, theme, pages } = ctx;
  const clan = site.clan;
  const nav = pages.filter((p) => p.enabled).map((p) => ({ title: p.title, path: p.path }));
  const logo = theme.logoUrl ?? clan.logoUrl;
  const style = { ...cssVariables(template, theme), background: "var(--cs-bg)", color: "var(--cs-text)", fontFamily: "var(--cs-font)" } as CSSProperties;
  const name = (
    <Link href="/" className="flex items-center gap-3">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element -- a clan's own logo from the host it chose
        <img src={logo} alt="" className="h-10 w-10 rounded-lg object-cover" />
      )}
      <span className="text-lg font-semibold tracking-tight">{clan.name}</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col" style={style}>
      {template === "HALL" ? (
        <header className="relative border-b border-[var(--cs-border)]">
          {theme.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- a clan's own banner from the host it chose
            <img src={theme.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          )}
          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-10 text-center">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element -- a clan's own logo from the host it chose
              <img src={logo} alt="" className="h-16 w-16 rounded-xl object-cover" />
            )}
            <Link href="/" className="text-3xl font-semibold tracking-wide">{clan.name}</Link>
            {clan.tagline && <p className="text-sm text-[var(--cs-muted)]">{clan.tagline}</p>}
            <SiteNav items={nav} centered />
          </div>
        </header>
      ) : (
        <header className={`border-b border-[var(--cs-border)] ${template === "MINIMAL" ? "bg-[var(--cs-surface)]" : ""}`}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            {name}
            <SiteNav items={nav} />
          </div>
          {template === "CLASSIC" && <div className="h-0.5 bg-[var(--cs-primary)]" />}
        </header>
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-[var(--cs-border)] px-6 py-5 text-xs text-[var(--cs-muted)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <span>
            {clan.name} · Made with JonnyBot
          </span>
          <ReportClan slug={site.slug} />
        </div>
      </footer>
    </div>
  );
}

/** A page heading in the site's look. */
export function SiteHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {sub && <p className="mt-2 text-[var(--cs-muted)]">{sub}</p>}
      <div className="mt-4 h-1 w-12 rounded bg-[var(--cs-accent)]" />
    </div>
  );
}

/** A box in the site's look. */
export function SiteCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-[var(--cs-border)] bg-[var(--cs-surface)] p-5 ${className}`}>{children}</section>;
}
