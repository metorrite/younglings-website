import { clanHref, jonnybotHref, type SiteInfo } from "@/lib/siteHosts";

export function JonnyBotFooter({ site }: { site: SiteInfo }) {
  const link = "text-muted transition hover:text-foreground";
  return (
    <footer className="mt-24 border-t border-surface-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8 px-4 py-10 text-sm sm:px-6">
        <div className="max-w-xs space-y-2">
          <p className="font-semibold">JonnyBot</p>
          <p className="text-muted">A Discord bot for RuneScape 3 clans and communities, built by the Younglings.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2">
          <a className={link} href={jonnybotHref(site, "/docs")}>Docs</a>
          <a className={link} href={jonnybotHref(site, "/install")}>Install</a>
          <a className={link} href={jonnybotHref(site, "/faq")}>FAQ</a>
          <a className={link} href={jonnybotHref(site, "/dashboard")}>Bot Dashboard</a>
          <a className={link} href={jonnybotHref(site, "/privacy")}>Privacy</a>
          <a className={link} href={jonnybotHref(site, "/terms")}>Terms</a>
          <a className={link} href={clanHref(site, "/")}>The Younglings clan site</a>
        </div>
      </div>
      <p className="border-t border-surface-border/60 px-4 py-4 text-center text-xs text-muted sm:px-6">
        JonnyBot is not affiliated with Jagex or Discord. RuneScape is a trademark of Jagex Ltd.
      </p>
    </footer>
  );
}
