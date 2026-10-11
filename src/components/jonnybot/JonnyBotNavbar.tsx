import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { canSeeJonnyBot } from "@/lib/jonnybotAccess";
import { clanHref, jonnybotHref, type SiteInfo } from "@/lib/siteHosts";
import { JonnyBotAccount } from "./JonnyBotAccount";

/** JonnyBot's own header: the two homes, the public pages, and the dashboard. Deliberately light: no clan data is fetched for it. */
export async function JonnyBotNavbar({ site }: { site: SiteInfo }) {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id ? { name: session.user.name ?? "Signed in", image: session.user.image ?? null } : null;

  // While the site is closed, a visitor who can't see it gets a header with nothing in it to click into.
  const visible = await canSeeJonnyBot();
  const links = visible
    ? [
        { label: "Younglings Home", href: clanHref(site, "/"), clan: true },
        { label: "JonnyBot Home", href: jonnybotHref(site, "/") },
        { label: "Docs", href: jonnybotHref(site, "/docs") },
        { label: "Install", href: jonnybotHref(site, "/install") },
        { label: "FAQ", href: jonnybotHref(site, "/faq") },
        { label: "Bot Dashboard", href: jonnybotHref(site, "/dashboard"), strong: true },
      ]
    : [{ label: "Younglings Home", href: clanHref(site, "/"), clan: true }];
  const cls = (strong?: boolean) => (strong ? "font-semibold text-gold transition hover:brightness-125" : "text-muted transition hover:text-foreground");

  return (
    <header className="relative z-40 border-b border-surface-border bg-surface/80 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        <Link href={jonnybotHref(site, "/")} className="flex shrink-0 items-center gap-2" aria-label="JonnyBot home">
          <Image src="/clan-logo.png" alt="" width={32} height={32} className="rounded-full" />
          <span className="font-semibold tracking-wide">JonnyBot</span>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-6 text-sm lg:flex" aria-label="Main">
          {links.map((l) => (
            <a key={l.label} href={l.href} className={cls(l.strong)}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex-1 lg:hidden" />
        <JonnyBotAccount user={user} signInTo={jonnybotHref(site, "/dashboard")} signOutTo={jonnybotHref(site, "/")} />
      </div>
      <nav className="flex gap-5 overflow-x-auto border-t border-surface-border/60 px-4 py-2.5 text-sm lg:hidden" aria-label="Main (compact)">
        {links.map((l) => (
          <a key={l.label} href={l.href} className={`shrink-0 ${cls(l.strong)}`}>
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
