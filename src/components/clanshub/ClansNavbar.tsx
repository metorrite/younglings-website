import Image from "next/image";
import Link from "next/link";
import { hubHref, jonnybotHref, type SiteInfo } from "@/lib/siteHosts";

/** The clans hub's own header: where to look for a clan, and a way for a clan to list itself. */
export function ClansNavbar({ site }: { site: SiteInfo }) {
  const links = [
    { label: "Clans", href: hubHref(site, "/") },
    { label: "Events", href: hubHref(site, "/events") },
    { label: "Leaderboards", href: hubHref(site, "/leaderboards") },
  ];
  return (
    <header className="relative z-40 border-b border-surface-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={hubHref(site, "/")} className="flex shrink-0 items-center gap-2" aria-label="Clans Hub home">
          <Image src="/clan-logo.png" alt="" width={32} height={32} className="rounded-full" />
          <span className="font-semibold tracking-wide">Clans Hub</span>
        </Link>
        <nav className="ml-2 flex flex-1 items-center gap-5 overflow-x-auto text-sm" aria-label="Main">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="shrink-0 text-muted transition hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <a href={site.hubHost ? `${site.jonnybotOrigin}/dashboard` : jonnybotHref(site, "/dashboard")} className="hidden shrink-0 rounded-lg border border-gold/60 px-3 py-1.5 text-sm font-semibold text-gold transition hover:bg-gold/10 sm:inline-block">
          List your clan
        </a>
      </div>
    </header>
  );
}
