import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/clansite/SiteShell";
import { clanSitesOn } from "@/lib/clanSites";
import { siteContext } from "@/lib/clanSitePage";

export const dynamic = "force-dynamic";

/**
 * A clan's own website (website builder). The proxy sends `<slug>.<SITE_TENANT_SUFFIX>` here and nothing else can reach it. The bot answers
 * only for a published site of a server in the beta; anything else is the "no clan website here" page.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ctx = clanSitesOn() ? await siteContext(slug) : undefined;
  if (!ctx) return { title: "Clan website", robots: { index: false, follow: false } };
  const { clan } = ctx.site;
  return {
    title: { default: clan.name, template: `%s | ${clan.name}` },
    description: clan.tagline || `${clan.name}, a RuneScape 3 clan`,
    robots: { index: false, follow: false },
  };
}

export default async function ClanSiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!clanSitesOn()) notFound();
  const ctx = await siteContext(slug);
  if (ctx === undefined) notFound();
  if (ctx === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">This clan website can&apos;t be shown right now</h1>
        <p className="mt-3 text-sm text-muted">Please try again in a few minutes.</p>
      </main>
    );
  }
  return <SiteShell ctx={ctx}>{children}</SiteShell>;
}
