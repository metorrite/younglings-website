import Link from "next/link";
import { FEED_KINDS, FeedList } from "@/components/site/FeedList";
import { PageHeader, Panel, Unavailable } from "@/components/site/blocks";
import { getFeed } from "@/lib/site";

export const metadata = { title: "Clan activity — Younglings" };
export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const kind = typeof query.kind === "string" && FEED_KINDS.some((k) => k.id === query.kind) ? query.kind : undefined;
  const items = await getFeed(80, kind);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Clan activity" subtitle="What members have been up to — level-ups, milestones, quests, boss kills, drops and Citadel caps, straight from their adventure logs." />

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter by type">
        <Link href="/activity" className={`rounded-full border px-3 py-1 ${!kind ? "border-gold bg-gold/15 text-gold" : "border-surface-border text-muted hover:text-foreground"}`}>
          Everything
        </Link>
        {FEED_KINDS.map((k) => (
          <Link
            key={k.id}
            href={`/activity?kind=${k.id}`}
            className={`rounded-full border px-3 py-1 ${kind === k.id ? "border-gold bg-gold/15 text-gold" : "border-surface-border text-muted hover:text-foreground"}`}
          >
            {k.icon} {k.label}
          </Link>
        ))}
      </nav>

      <Panel>{items === null ? <Unavailable what="The activity feed" /> : <FeedList items={items} />}</Panel>
    </div>
  );
}
