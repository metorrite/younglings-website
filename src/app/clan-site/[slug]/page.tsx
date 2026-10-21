import { notFound } from "next/navigation";
import { ReportClan } from "@/components/clanshub/ReportClan";
import { getTenantSite } from "@/lib/clanSites";

/** The clan site's home page. The templates (Classic, Hall, Minimal) and the other pages arrive with the builder's page system (T-066). */
export default async function ClanSiteHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getTenantSite(slug);
  if (!site) notFound();
  const { clan } = site;
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {clan.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a clan's own logo from any host it chose
          <img src={clan.logoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
        )}
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{clan.name}</h1>
        {clan.tagline && <p className="mt-3 text-lg text-muted">{clan.tagline}</p>}
        {clan.description && <p className="mt-6 max-w-xl whitespace-pre-line text-sm text-muted">{clan.description}</p>}
      </main>
      <footer className="flex flex-wrap items-center justify-center gap-4 border-t border-surface-border px-6 py-4 text-xs text-muted">
        <span>Made with JonnyBot</span>
        <ReportClan slug={site.slug} />
      </footer>
    </div>
  );
}
