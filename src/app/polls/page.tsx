import { PageHeader, Panel, Unavailable } from "@/components/site/blocks";
import { getPolls, shortDate, type PollSummary } from "@/lib/site";

export const metadata = { title: "Polls — Younglings" };
export const dynamic = "force-dynamic";

function Poll({ poll }: { poll: PollSummary }) {
  const max = Math.max(1, ...poll.options.map((o) => o.votes));
  const open = poll.status === "ACTIVE";
  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{poll.title}</h2>
          <p className="text-xs text-muted">
            {open ? "Open" : `Closed ${poll.closedAt ? shortDate(poll.closedAt) : ""}`} · started {shortDate(poll.createdAt)} · {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
            {poll.multiple ? " · multiple choice" : ""}
            {poll.anonymous ? " · anonymous" : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${open ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-muted"}`}>{open ? "Open" : "Closed"}</span>
      </div>
      <ul className="space-y-2">
        {poll.options.map((o) => (
          <li key={o.label} className="relative overflow-hidden rounded-md border border-surface-border/60 bg-background/40 px-3 py-2 text-sm">
            <div className="absolute inset-y-0 left-0 bg-gold/20" style={{ width: `${(o.votes / max) * 100}%` }} />
            <div className="relative flex items-center justify-between gap-3">
              <span className="truncate">{o.label}</span>
              <span className="shrink-0 text-xs text-muted">
                {o.votes}
                {poll.totalVotes > 0 && ` · ${Math.round((o.votes / poll.totalVotes) * 100)}%`}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {open && poll.url && (
        <a href={poll.url} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-md bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4]">
          Vote in Discord ↗
        </a>
      )}
    </Panel>
  );
}

export default async function PollsPage() {
  const polls = await getPolls();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Polls" subtitle="The clan's polls and how they're going. Voting happens in Discord." />
      {polls === null ? (
        <Unavailable what="Polls" />
      ) : polls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No polls yet.</div>
      ) : (
        <>
          {polls.map((poll) => (
            <Poll key={poll.id} poll={poll} />
          ))}
        </>
      )}
    </div>
  );
}
