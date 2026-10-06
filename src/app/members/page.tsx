import { DonutChart } from "@/components/charts";
import { MemberTable } from "@/components/site/MemberTable";
import { PageHeader, Panel, Unavailable } from "@/components/site/blocks";
import { getRoster } from "@/lib/site";

export const metadata = { title: "Members — Younglings" };
// Rendered per request: the data comes from the bot over a private network that doesn't exist at build time,
// so prerendering would bake in an empty "unavailable" page. The fetches themselves are still cached briefly.
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const roster = await getRoster();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader title="Members" subtitle="Everyone currently in the clan. Open a member to see their stats, gains, Citadel record and adventure log." />

      {roster === null ? (
        <Unavailable what="The member list" />
      ) : (
        <div className="space-y-6">
          <Panel title="Ranks">
            <DonutChart
              slices={[...roster.ranks]
                .sort((a, b) => b.order - a.order)
                .map((r) => ({ label: r.name, value: r.count }))}
              center={
                <>
                  <span className="text-3xl font-bold">{roster.members.length}</span>
                  <span className="text-xs text-muted">members</span>
                </>
              }
            />
          </Panel>
          <MemberTable members={roster.members} ranks={roster.ranks} />
        </div>
      )}
    </div>
  );
}
