import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClanMark, EventRow, FocusChips, RecruitingBadge, Unavailable, VerifiedTick } from "@/components/clanshub/parts";
import { ReportClan } from "@/components/clanshub/ReportClan";
import { accent, clanEvents, getClan } from "@/lib/clansHub";
import { hubHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const clan = await getClan(slug);
  return clan ? { title: clan.name, description: clan.tagline || `${clan.name} on the Clans Hub` } : { title: "Clan" };
}

/** Only an http(s) link is offered as the apply button, whatever a clan typed. */
function safeUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function ClanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await currentSite();
  const clan = await getClan(slug);
  if (clan === undefined) notFound();
  if (clan === null)
    return (
      <div className="space-y-4">
        <Unavailable />
      </div>
    );

  const events = await clanEvents(slug);
  const apply = safeUrl(clan.applyUrl);

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={hubHref(site, "/")} className="hover:text-foreground hover:underline">
          Clans
        </Link>{" "}
        / <span className="text-foreground">{clan.name}</span>
      </nav>

      <header className="flex flex-wrap items-center gap-4 rounded-xl border border-surface-border bg-surface p-6" style={{ borderTop: `4px solid ${accent(clan.colour)}` }}>
        <ClanMark clan={clan} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold break-words">{clan.name}</h1>
          {clan.tagline && <p className="mt-1 break-words text-muted">{clan.tagline}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <RecruitingBadge clan={clan} />
            <VerifiedTick clan={clan} />
            {!clan.listed && <span className="text-xs text-muted">Unlisted: only people with this link can see it</span>}
          </div>
        </div>
        {apply && (
          <a href={apply} target="_blank" rel="noreferrer noopener" className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110">
            How to apply
          </a>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          {clan.description && (
            <section>
              <h2 className="text-lg font-semibold">About</h2>
              <p className="mt-2 break-words whitespace-pre-wrap text-muted">{clan.description}</p>
            </section>
          )}
          {clan.requirements && (
            <section>
              <h2 className="text-lg font-semibold">Requirements</h2>
              <p className="mt-2 break-words whitespace-pre-wrap text-muted">{clan.requirements}</p>
            </section>
          )}
          <section aria-label="Upcoming events">
            <h2 className="text-lg font-semibold">Coming up</h2>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-muted">This clan has no public events scheduled.</p>
            ) : (
              <ul className="mt-1 divide-y divide-surface-border">
                {events.map((e) => (
                  <EventRow key={e.id} event={e} site={site} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <div className="space-y-3 rounded-xl border border-surface-border bg-surface p-5 text-sm">
            <h2 className="font-semibold">At a glance</h2>
            {clan.focus.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-muted">Focus</p>
                <FocusChips focus={clan.focus} />
              </div>
            )}
            {clan.memberCount !== null && (
              <p className="flex justify-between gap-3">
                <span className="text-muted">Members</span>
                <span className="tabular-nums">{clan.memberCount}</span>
              </p>
            )}
            {clan.timezone && (
              <p className="flex justify-between gap-3">
                <span className="text-muted">Timezone</span>
                <span>{clan.timezone}</span>
              </p>
            )}
            {clan.clanName && (
              <p className="flex justify-between gap-3">
                <span className="text-muted">In-game clan</span>
                <span>{clan.clanName}</span>
              </p>
            )}
          </div>
          <ReportClan slug={clan.slug} />
        </aside>
      </div>
    </div>
  );
}
