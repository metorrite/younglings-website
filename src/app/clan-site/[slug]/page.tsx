import { Blocks } from "@/components/clansite/Blocks";
import { SiteCard } from "@/components/clansite/SiteShell";
import { sitePage } from "@/lib/clanSitePage";
import { tenantData, tenantEvents } from "@/lib/clanSites";
import { EventList, RecapSummary } from "@/components/clansite/parts";

/** Home: banner, the clan's own intro blocks, the next events and the latest weekly recap. */
export default async function ClanSiteHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { site, theme, template, pages } = await sitePage(slug, "home");
  const showEvents = pages.find((p) => p.key === "events")?.enabled;
  const showRecaps = pages.find((p) => p.key === "recaps")?.enabled;
  const [events, recap] = await Promise.all([showEvents ? tenantEvents(slug) : [], showRecaps ? tenantData(slug, "recap", "period=last-week") : null]);
  const { clan } = site;
  const hasIntro = site.blocks.some((b) => b.page === "home");

  return (
    <div className="space-y-10">
      {template !== "HALL" && theme.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a clan's own banner from the host it chose
        <img src={theme.bannerUrl} alt="" className="h-56 w-full rounded-xl object-cover" />
      )}
      {template !== "HALL" && (
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{clan.name}</h1>
          {clan.tagline && <p className="mt-2 text-lg text-[var(--cs-muted)]">{clan.tagline}</p>}
        </div>
      )}
      {hasIntro ? <Blocks blocks={site.blocks} page="home" /> : clan.description && <p className="max-w-2xl whitespace-pre-line text-[var(--cs-muted)]">{clan.description}</p>}
      <div className="grid gap-6 md:grid-cols-2">
        {showEvents && (
          <SiteCard>
            <h2 className="mb-4 text-lg font-semibold">Coming up</h2>
            <EventList events={events.slice(0, 3)} empty="No events planned right now." />
          </SiteCard>
        )}
        {showRecaps && recap && (
          <SiteCard>
            <h2 className="mb-4 text-lg font-semibold">Last week</h2>
            <RecapSummary recap={recap} />
          </SiteCard>
        )}
      </div>
    </div>
  );
}
