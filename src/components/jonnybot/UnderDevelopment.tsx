import Image from "next/image";
import { clanHref, type SiteInfo } from "@/lib/siteHosts";

/** What everyone but the clan's admins sees of JonnyBot's site until it is opened. */
export function UnderDevelopment({ site }: { site: SiteInfo }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <Image src="/clan-logo.png" alt="" width={112} height={112} className="rounded-full opacity-90" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">JonnyBot is still under development</h1>
      <p className="mt-3 text-lg text-muted">This page isn&apos;t open yet. Check back later.</p>
      <a href={clanHref(site, "/")} className="mt-8 rounded-md border border-surface-border px-5 py-2.5 text-sm font-semibold transition hover:border-gold">
        Go to the Younglings home page
      </a>
    </div>
  );
}
