import Image from "next/image";
import Link from "next/link";
import { HubNavLinks } from "@/components/clanshub/HubNavLinks";
import { hubHref, jonnybotHref, type SiteInfo } from "@/lib/siteHosts";

/** The clans hub's own header: sticky, as wide as the page, with a search that works from anywhere and a way for a clan to list itself. */
export function ClansNavbar({ site }: { site: SiteInfo }) {
  const links = [
    { label: "Clans", href: hubHref(site, "/"), path: "/" },
    { label: "Events", href: hubHref(site, "/events"), path: "/events" },
    { label: "Leaderboards", href: hubHref(site, "/leaderboards"), path: "/leaderboards" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={hubHref(site, "/")} className="flex shrink-0 items-center gap-2.5" aria-label="Clans Hub home">
          <Image src="/clan-logo.png" alt="" width={34} height={34} className="rounded-xl" />
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            Clans <span className="text-gold">Hub</span>
          </span>
        </Link>
        <HubNavLinks links={links} />
        <form action={hubHref(site, "/")} method="get" role="search" className="ml-auto hidden min-w-0 md:block">
          <input
            name="q"
            placeholder="Search clans"
            aria-label="Search clans"
            className="w-56 rounded-xl border border-surface-border bg-surface px-3.5 py-2 text-sm placeholder:text-muted/70 focus:border-gold focus:outline-none lg:w-72"
          />
        </form>
        <a
          href={site.hubHost ? `${site.jonnybotOrigin}/dashboard` : jonnybotHref(site, "/dashboard")}
          className="ml-auto shrink-0 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 md:ml-0"
        >
          <span className="sm:hidden">List</span>
          <span className="hidden sm:inline">List your clan</span>
        </a>
      </div>
    </header>
  );
}
