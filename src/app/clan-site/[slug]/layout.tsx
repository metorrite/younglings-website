import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { clanSitesOn, getTenantSite } from "@/lib/clanSites";

export const dynamic = "force-dynamic";

/**
 * A clan's own website (website builder). The proxy sends `<slug>.<SITE_TENANT_SUFFIX>` here and nothing else can reach it. The bot answers
 * only for a published site of a server in the beta; anything else is the "no clan website here" page.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const site = clanSitesOn() ? await getTenantSite(slug) : undefined;
  if (!site) return { title: "Clan website", robots: { index: false, follow: false } };
  return {
    title: { default: site.clan.name, template: `%s | ${site.clan.name}` },
    description: site.clan.tagline || `${site.clan.name}, a RuneScape 3 clan`,
    robots: { index: false, follow: false },
  };
}

export default async function ClanSiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!clanSitesOn()) notFound();
  const site = await getTenantSite(slug);
  if (site === undefined) notFound();
  if (site === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">This clan website can&apos;t be shown right now</h1>
        <p className="mt-3 text-sm text-muted">Please try again in a few minutes.</p>
      </main>
    );
  }
  return <>{children}</>;
}
