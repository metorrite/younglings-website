"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { addNoteAction, deleteNoteAction, loadNotesAction } from "@/app/admin/(console)/actions";
import type { MemberNote, Roster, RosterMember } from "@/lib/jonnybot-admin";

// A shared once-a-minute clock for the "5m ago" labels. The server renders no time-relative text, so nothing can mismatch.
const subscribe = (notify: () => void) => {
  const id = window.setInterval(notify, 30_000);
  return () => window.clearInterval(id);
};
const snapshot = () => Math.floor(Date.now() / 30_000) * 30_000;

function span(ms: number): string {
  const abs = Math.abs(ms);
  const minutes = Math.round(abs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h${minutes % 60 >= 1 && hours < 10 ? ` ${minutes % 60}m` : ""}`;
  return `${Math.floor(hours / 24)}d`;
}
const ago = (iso: string | null, now: number | null) => (!iso ? "never" : now === null ? "…" : `${span(now - Date.parse(iso))} ago`);
const until = (iso: string | null, now: number | null) => (!iso ? "—" : now === null ? "…" : Date.parse(iso) <= now ? "due" : `in ~${span(Date.parse(iso) - now)}`);

type SortKey = "rank" | "rsn" | "points" | "updated" | "next" | "activity" | "total";
const FILTERS = [
  { id: "unverified", label: "Unverified", test: (m: RosterMember) => !m.verified },
  { id: "stale", label: "Stale data", test: (m: RosterMember, now: number | null) => now !== null && (!m.lastPolled || now - Date.parse(m.lastPolled) > 8 * 3_600_000) },
  { id: "uncapped", label: "Not capped", test: (m: RosterMember) => !m.cappedThisWeek },
  { id: "promo", label: "Promotion due", test: (m: RosterMember) => m.promotionNeeded },
  { id: "notes", label: "Has notes", test: (m: RosterMember) => m.notes > 0 },
] as const;

export function MembersTable({ roster }: { roster: Roster }) {
  const now = useSyncExternalStore(subscribe, snapshot, () => null);
  const [query, setQuery] = useState("");
  const [rank, setRank] = useState("");
  const [active, setActive] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: -1 });
  const [open, setOpen] = useState<string | null>(null);
  const [notesByRsn, setNotesByRsn] = useState<Record<string, MemberNote[]>>({});
  const [, startLoad] = useTransition();

  // Notes are fetched when a row is opened (in the click handler, not during render), then kept here.
  function toggle(rsn: string) {
    if (open === rsn) return setOpen(null);
    setOpen(rsn);
    if (!notesByRsn[rsn]) {
      startLoad(async () => {
        const r = await loadNotesAction(rsn);
        if (r.ok) setNotesByRsn((prev) => ({ ...prev, [rsn]: r.data }));
      });
    }
  }

  const ranks = useMemo(() => [...new Map(roster.members.map((m) => [m.rank, m.rankOrder])).entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name), [roster.members]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = roster.members.filter(
      (m) =>
        (q === "" || m.rsn.toLowerCase().includes(q) || (m.discordName ?? "").toLowerCase().includes(q)) &&
        (rank === "" || m.rank === rank) &&
        active.every((id) => FILTERS.find((f) => f.id === id)?.test(m, now)),
    );
    const value = (m: RosterMember): number | string => {
      switch (sort.key) {
        case "rsn": return m.rsn.toLowerCase();
        case "points": return m.points;
        case "updated": return m.lastPolled ? Date.parse(m.lastPolled) : 0;
        case "next": return m.nextPoll ? Date.parse(m.nextPoll) : Number.MAX_SAFE_INTEGER;
        case "activity": return m.lastActivity ? Date.parse(m.lastActivity) : 0;
        case "total": return m.totalLevel ?? 0;
        default: return m.rankOrder * 1e6 + m.points;
      }
    };
    return [...filtered].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (x < y ? -1 : x > y ? 1 : a.rsn.localeCompare(b.rsn)) * sort.dir;
    });
  }, [roster.members, query, rank, active, sort, now]);

  const header = (key: SortKey, label: string, className = "") => (
    <th scope="col" className={`px-3 py-2 font-medium ${className}`}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "rsn" ? 1 : -1 }))} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
        {label}
        <span aria-hidden className={sort.key === key ? "text-gold" : "opacity-0"}>{sort.dir === 1 ? "▲" : "▼"}</span>
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search RSN or Discord name…" aria-label="Search members" className="w-64 rounded-md border border-surface-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold/60" />
        <select value={rank} onChange={(e) => setRank(e.target.value)} aria-label="Filter by rank" className="rounded-md border border-surface-border bg-background px-2 py-1.5 text-sm">
          <option value="">All ranks</option>
          {ranks.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {FILTERS.map((f) => {
          const on = active.includes(f.id);
          return (
            <button key={f.id} type="button" aria-pressed={on} onClick={() => setActive(on ? active.filter((x) => x !== f.id) : [...active, f.id])} className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${on ? "border-gold bg-gold/15 text-gold" : "border-surface-border hover:border-gold/50"}`}>
              {f.label}
            </button>
          );
        })}
        <span className="ml-auto text-sm text-muted">
          {rows.length} of {roster.members.length}
        </span>
        <a href="/admin/members/export" className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:border-gold/50">
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="bg-surface text-xs tracking-wider text-muted">
            <tr>
              {header("rsn", "Member")}
              {header("rank", "Rank")}
              <th scope="col" className="px-3 py-2 font-medium uppercase">Discord</th>
              {header("points", "Points", "text-right")}
              {header("updated", "Updated")}
              {header("next", "Next update")}
              <th scope="col" className="px-3 py-2 text-center font-medium uppercase">Citadel</th>
              {header("activity", "Last activity")}
              {header("total", "Total lvl", "text-right")}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60">
            {rows.map((m) => (
              <Fragment key={m.rsn}>
                <tr onClick={() => toggle(m.rsn)} className={`cursor-pointer transition-colors hover:bg-white/5 ${open === m.rsn ? "bg-white/5" : ""}`}>
                  <td className="px-3 py-2 font-medium">
                    {m.rsn}
                    {m.notes > 0 && <span className="ml-2 rounded bg-gold/15 px-1.5 text-[11px] text-gold" title={`${m.notes} private note${m.notes === 1 ? "" : "s"}`}>📝 {m.notes}</span>}
                  </td>
                  <td className="px-3 py-2 text-muted">{m.rank}</td>
                  <td className="px-3 py-2">
                    {m.verified ? (
                      <span className="text-emerald-400" title={m.verificationMethod ? `Verified by ${m.verificationMethod.toLowerCase()}` : "Verified"}>
                        ✓ {m.discordName ?? "linked"}
                      </span>
                    ) : (
                      <span className="text-muted">— not linked</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${m.promotionNeeded ? "font-semibold text-gold" : ""}`}>
                    {m.points.toLocaleString("en-US")}
                    {m.promotionNeeded && <span title="Due a promotion"> ⬆</span>}
                  </td>
                  <td className="px-3 py-2 text-muted tabular-nums">{ago(m.lastPolled, now)}</td>
                  <td className="px-3 py-2 text-muted tabular-nums">{roster.autoPoll ? until(m.nextPoll, now) : "off"}</td>
                  <td className="px-3 py-2 text-center" title={m.cappedThisWeek ? "Capped this week" : m.visitedThisWeek ? "Visited, not capped" : "Not visited this week"}>
                    <span className={m.visitedThisWeek ? "text-gold" : "text-muted/40"}>●</span> <span className={m.cappedThisWeek ? "text-emerald-400" : "text-muted/40"}>✔</span>
                  </td>
                  <td className="px-3 py-2 text-muted tabular-nums">{ago(m.lastActivity, now)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{m.totalLevel?.toLocaleString("en-US") ?? "—"}</td>
                </tr>
                {open === m.rsn && (
                  <tr className="bg-background/40">
                    <td colSpan={9} className="px-4 py-4">
                      <MemberDetail member={m} notes={notesByRsn[m.rsn]} onNotes={(list) => setNotesByRsn((prev) => ({ ...prev, [m.rsn]: list }))} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No members match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        The roster refreshes once every {Math.round(roster.pollCycleSeconds / 3600)} hours, so &ldquo;next update&rdquo; is an estimate. Citadel: <span className="text-gold">●</span> visited this week, <span className="text-emerald-400">✔</span> capped (weeks start Wednesday). Click a row for details and private notes.
      </p>
    </div>
  );
}

function MemberDetail({ member: m, notes, onNotes }: { member: RosterMember; notes: MemberNote[] | undefined; onNotes: (list: MemberNote[]) => void }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <Fact label="Discord" value={m.verified ? `${m.discordName ?? "linked"}${m.discordId ? ` (${m.discordId})` : ""}` : "not linked"} />
        <Fact label="Verified" value={m.verifiedAt ? `${m.verifiedAt.slice(0, 10)}${m.verificationMethod ? ` · ${m.verificationMethod.toLowerCase()}` : ""}` : "—"} />
        <Fact label="Joined clan" value={m.joinedAt ?? m.firstSeen?.slice(0, 10) ?? "—"} />
        <Fact label="Combat / total level" value={`${m.combatLevel ?? "—"} / ${m.totalLevel?.toLocaleString("en-US") ?? "—"}`} />
        <Fact label="Total XP" value={m.totalXp.toLocaleString("en-US")} />
        <Fact label="Boss kills" value={m.kills.toLocaleString("en-US")} />
        <Fact label="Last refreshed" value={m.lastPolled ? new Date(m.lastPolled).toLocaleString() : "never"} />
        <Fact label="Next refresh (est.)" value={m.nextPoll ? new Date(m.nextPoll).toLocaleString() : "—"} />
        <div className="col-span-2 flex flex-wrap gap-3 pt-2 text-sm">
          <Link href={`/members/${encodeURIComponent(m.rsn)}`} className="text-gold hover:underline">Public profile →</Link>
          <Link href={`/recap/member/${encodeURIComponent(m.rsn)}/month`} className="text-gold hover:underline">Recap →</Link>
          <a href={`https://secure.runescape.com/m=hiscore/compare?user1=${encodeURIComponent(m.rsn)}`} target="_blank" rel="noreferrer" className="text-gold hover:underline">Hiscores ↗</a>
          {m.discordId && <a href={`https://discord.com/users/${m.discordId}`} target="_blank" rel="noreferrer" className="text-gold hover:underline">Discord profile ↗</a>}
        </div>
      </dl>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gold">Private notes <span className="font-normal text-muted">— only staff see these</span></h3>
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setError(null);
            startTransition(async () => {
              const r = await addNoteAction(m.rsn, draft);
              if (r.ok) {
                onNotes(r.data);
                setDraft("");
              } else setError(r.error);
            });
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder={`Add a note about ${m.rsn}…`} className="min-w-0 flex-1 rounded-md border border-surface-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold/60" />
          <button type="submit" disabled={pending || !draft.trim()} className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-background disabled:opacity-40">Add</button>
        </form>
        {error && <p role="alert" className="mb-2 text-sm text-red-400">{error}</p>}
        {notes === undefined ? (
          <p className="text-sm text-muted">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-surface-border/70 bg-surface p-3 text-sm">
                <p className="whitespace-pre-wrap">{n.note}</p>
                <p className="mt-1 flex items-center justify-between text-xs text-muted">
                  <span>{n.authorName ?? "Someone"} · {new Date(n.at).toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await deleteNoteAction(n.id, m.rsn);
                        if (r.ok) onNotes(r.data);
                        else setError(r.error);
                      })
                    }
                    className="hover:text-red-400"
                  >
                    Delete
                  </button>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}
