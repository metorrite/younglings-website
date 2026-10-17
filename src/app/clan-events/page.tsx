import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { EventJoinButton } from "@/components/profile/EventJoinButton";
import { PageHeader, Panel, Unavailable } from "@/components/site/blocks";
import { authOptions } from "@/lib/auth";
import { memberApi, type MyEvent } from "@/lib/member";
import { compact, shortDate } from "@/lib/site";

export const metadata = { title: "Clan events — Younglings" };
export const dynamic = "force-dynamic";

const STAGE: Record<MyEvent["status"], string> = { SIGNUPS: "Signups open", RUNNING: "Running", SCORING: "Scoring", DONE: "Finished", CANCELLED: "Cancelled" };
const TEMPLATE: Record<string, string> = { bingo: "Bingo", "scavenger-hunt": "Scavenger hunt", competition: "Competition", "boss-night": "Boss night", custom: "Event" };

export default async function ClanEventsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=%2Fclan-events");
  const mine = await memberApi.myEvents(session.user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Clan events" subtitle="Bingos, hunts and competitions you are in or can join. Open one to see your team, your progress, what you've sent and where the channels are." />
      {!mine.ok ? (
        <Unavailable what="Clan events" />
      ) : (
        <>
          <Panel title="Your events">
            {mine.data.events.length === 0 ? (
              <p className="text-sm text-muted">You haven&apos;t joined any events yet.</p>
            ) : (
              <ul className="divide-y divide-surface-border/60 text-sm">
                {mine.data.events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/clan-events/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-gold">
                      <span className="min-w-0">
                        <span className="font-medium break-words">{e.name}</span>
                        <span className="block text-xs text-muted">
                          {TEMPLATE[e.template] ?? "Event"} · {e.scoringMode === "TEAM" ? (e.team ? `Team ${e.team}` : "Teams") : "Solo"}
                          {e.waiting ? " · On the waitlist" : e.rank > 0 ? ` · Place ${e.rank} of ${e.of} · ${e.points.toLocaleString("en-GB")} pts` : ""}
                        </span>
                      </span>
                      <span className="rounded-full border border-surface-border px-2 py-0.5 text-xs text-muted">{STAGE[e.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {mine.data.open.length > 0 && (
            <Panel title="Open for signup" hint="You need to be in the server's Discord to take part.">
              <ul className="divide-y divide-surface-border/60 text-sm">
                {mine.data.open.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <Link href={`/clan-events/${o.id}`} className="min-w-0 space-y-0.5 hover:text-gold">
                      <span className="font-medium">{o.name}</span>
                      <span className="block text-xs text-muted">
                        {TEMPLATE[o.template] ?? "Event"} · {o.scoringMode === "TEAM" ? "Teams" : "Solo"} ·{" "}
                        {o.closed ? "Signups are closed" : o.signupClosesAt ? `Signups close ${shortDate(o.signupClosesAt)}` : "No signup deadline"}
                        {o.buyIn > 0 ? ` · Buy-in ${compact(o.buyIn)} gp` : ""}
                        {o.verification ? " · Needs verification" : ""}
                      </span>
                    </Link>
                    {!o.closed && <EventJoinButton eventId={o.id} mode="join" />}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
