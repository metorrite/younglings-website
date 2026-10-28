import type { Metadata } from "next";
import { SiteCard, SiteHeading } from "@/components/clansite/SiteShell";
import { Unavailable } from "@/components/clansite/parts";
import { sitePage } from "@/lib/clanSitePage";
import { tenantData } from "@/lib/clanSites";

export const metadata: Metadata = { title: "Roster" };

const joinedFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** Ranks and RuneScape names (the clan list is public in game). Join dates only when the clan chose to show them. */
export default async function Roster({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { page } = await sitePage(slug, "roster");
  const data = await tenantData(slug, "members");
  if (!data) {
    return (
      <>
        <SiteHeading title={page.title} />
        <Unavailable />
      </>
    );
  }
  const byRank = [...data.ranks]
    .sort((a, b) => a.order - b.order)
    .map((r) => ({ rank: r.name, members: data.members.filter((m) => m.rank === r.name) }))
    .filter((g) => g.members.length > 0);
  return (
    <>
      <SiteHeading title={page.title} sub={`${data.members.length} members`} />
      <div className="grid gap-6 md:grid-cols-2">
        {byRank.map((group) => (
          <SiteCard key={group.rank}>
            <h2 className="mb-3 flex items-baseline justify-between font-semibold">
              {group.rank} <span className="text-xs font-normal text-[var(--cs-muted)]">{group.members.length}</span>
            </h2>
            <ul className="space-y-1 text-sm">
              {group.members.map((m) => (
                <li key={m.rsn} className="flex justify-between gap-4">
                  <span>{m.rsn}</span>
                  {page.showJoined && m.joined && <span className="text-[var(--cs-muted)]">{joinedFmt.format(new Date(m.joined))}</span>}
                </li>
              ))}
            </ul>
          </SiteCard>
        ))}
      </div>
    </>
  );
}
