"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { votePollAction } from "@/app/polls/actions";
import type { PollSummary } from "@/lib/site";
import { discordPath, shortDate } from "@/lib/site";
import { PollAdminBar } from "./AdminTools";
import { DiscordLink } from "./DiscordLink";
import { LocalTime } from "./LocalTime";
import { Tip, TipBody } from "@/components/ui/Tip";

/**
 * A poll you can vote in. Bars animate to the new split the moment you click (and settle to the server's real
 * numbers when it answers), the leading option is highlighted, your own picks are marked, and an open poll
 * quietly refreshes itself every 15 seconds so other people's votes appear without a reload.
 */
export function PollCard({ poll, initialMine, loggedIn, admin = false }: { poll: PollSummary; initialMine: number[]; loggedIn: boolean; admin?: boolean }) {
  const router = useRouter();
  const [options, setOptions] = useState(poll.options);
  const [mine, setMine] = useState<number[]>(initialMine);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lastVote = useRef(0);

  // Take fresh numbers from the server whenever it re-renders this page (adjusting state during render, not in an effect).
  const [seenOptions, setSeenOptions] = useState(poll.options);
  const [seenMine, setSeenMine] = useState(initialMine);
  if (poll.options !== seenOptions) {
    setSeenOptions(poll.options);
    setOptions(poll.options);
  }
  if (initialMine !== seenMine) {
    setSeenMine(initialMine);
    setMine(initialMine);
  }

  useEffect(() => {
    if (!poll.active) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [poll.active, router]);

  const total = options.reduce((sum, o) => sum + o.votes, 0);
  const leader = Math.max(0, ...options.map((o) => o.votes));

  function vote(number: number, clickedAt: number) {
    if (!poll.active) return;
    // Ignore clicks that land right on the heels of the last one — the server limits too, but there's no need to send them.
    if (clickedAt - lastVote.current < 600) return;
    lastVote.current = clickedAt;
    if (!loggedIn) {
      setError("Log in with Discord to vote.");
      return;
    }
    setError(null);

    const previousOptions = options;
    const previousMine = mine;
    const had = mine.includes(number);

    // Optimistic: show the result straight away, then let the server correct it.
    const nextMine = poll.multiple ? (had ? mine.filter((n) => n !== number) : [...mine, number]) : had ? [] : [number];
    setMine(nextMine);
    setOptions((current) =>
      current.map((o) => {
        const wasMine = previousMine.includes(o.number);
        const isMine = nextMine.includes(o.number);
        return { ...o, votes: Math.max(0, o.votes + (isMine ? 1 : 0) - (wasMine ? 1 : 0)) };
      }),
    );

    start(async () => {
      const result = await votePollAction(poll.id, number);
      if (!result.ok) {
        setOptions(previousOptions);
        setMine(previousMine);
        setError(result.error);
        return;
      }
      setMine(result.mine);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-surface-border bg-surface/90 p-5 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{poll.title}</h2>
          <p className="mt-1 text-xs text-muted">
            {poll.active ? "Open" : `Closed ${poll.closedAt ? shortDate(poll.closedAt) : ""}`} · started {shortDate(poll.createdAt)}
            {poll.active && poll.closesAt && (
              <>
                {" "}
                · closes <LocalTime iso={poll.closesAt} mode="relative" />
              </>
            )}
            {poll.multiple ? " · pick as many as you like" : " · pick one"}
            {poll.anonymous ? " · anonymous" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-gold">{total}</p>
          <p className="text-xs text-muted">vote{total === 1 ? "" : "s"}</p>
        </div>
      </header>

      <ul className="space-y-2.5">
        {options.map((o) => {
          const pct = total > 0 ? (o.votes / total) * 100 : 0;
          const isMine = mine.includes(o.number);
          const isLeader = leader > 0 && o.votes === leader;
          return (
            <li key={o.number}>
              <button
                type="button"
                disabled={!poll.active || pending}
                onClick={(e) => vote(o.number, e.timeStamp)}
                aria-pressed={isMine}
                className={`group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition ${
                  isMine ? "border-gold" : "border-surface-border/70"
                } ${poll.active ? "cursor-pointer hover:border-gold/60" : "cursor-default"} disabled:opacity-90`}
              >
                <span
                  className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${isLeader ? "bg-gradient-to-r from-gold/45 to-gold/15" : "bg-white/10"}`}
                  style={{ width: `${pct}%` }}
                />
                <span className="relative flex items-center justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isMine ? "bg-gold text-background" : "bg-white/10 text-muted"}`}>
                      {isMine ? "✓" : o.number}
                    </span>
                    <span className="truncate font-medium">{o.label}</span>
                    {isLeader && poll.active === false && (
                      <Tip content={<TipBody title="Winner" />}>
                        <span>🏆</span>
                      </Tip>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-semibold tabular-nums">{Math.round(pct)}%</span>
                    <span className="block text-[11px] text-muted">{o.votes} vote{o.votes === 1 ? "" : "s"}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {admin && poll.active && <PollAdminBar pollId={poll.id} />}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>
          {poll.active
            ? loggedIn
              ? mine.length > 0
                ? "Click your choice again to take your vote back."
                : "Click an option to vote."
              : "Log in with Discord to vote — verified clan members only."
            : "This poll has ended."}
        </span>
        {poll.url && (
          <DiscordLink path={discordPath(poll.url)} className="hover:text-gold">
            Open in Discord ↗
          </DiscordLink>
        )}
      </footer>
    </section>
  );
}
