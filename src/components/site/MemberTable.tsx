"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { compact, full, rankColor, shortDate, type RankInfo, type RosterMember } from "@/lib/site";
import { RankBadge } from "./blocks";

type SortKey = "rank" | "name" | "totalXp" | "totalLevel" | "points" | "joined";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "name", label: "Name" },
  { key: "totalXp", label: "Total XP" },
  { key: "totalLevel", label: "Total level" },
  { key: "points", label: "Clan points" },
  { key: "joined", label: "Joined" },
];

/** The searchable, filterable, sortable roster. The member list arrives pre-fetched; everything here is client-side. */
export function MemberTable({ members, ranks }: { members: RosterMember[]; ranks: RankInfo[] }) {
  const [query, setQuery] = useState("");
  const [rank, setRank] = useState("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [descending, setDescending] = useState(true);

  const maxOrder = Math.max(0, ...ranks.map((r) => r.order));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = members.filter((m) => (rank === "all" || m.rank === rank) && (q === "" || m.rsn.toLowerCase().includes(q)));
    const value = (m: RosterMember): number | string => {
      switch (sort) {
        case "name": return m.rsn.toLowerCase();
        case "totalXp": return m.totalXp;
        case "totalLevel": return m.totalLevel ?? 0;
        case "points": return m.points;
        case "joined": return m.joined;
        default: return m.rankOrder;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : a.rsn.toLowerCase().localeCompare(b.rsn.toLowerCase());
      return descending ? -cmp : cmp;
    });
  }, [members, query, rank, sort, descending]);

  const field = "rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className={`${field} min-w-56 flex-1`}
          aria-label="Search members"
        />
        <select value={rank} onChange={(e) => setRank(e.target.value)} className={field} aria-label="Filter by rank">
          <option value="all">All ranks</option>
          {[...ranks].sort((a, b) => b.order - a.order).filter((r) => r.count > 0).map((r) => (
            <option key={r.name} value={r.name}>
              {r.name} ({r.count})
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={field} aria-label="Sort by">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setDescending((d) => !d)} className={`${field} text-muted hover:text-foreground`} aria-label="Reverse the order">
          {descending ? "↓ High to low" : "↑ Low to high"}
        </button>
      </div>

      <p className="mb-3 text-xs text-muted">
        Showing {rows.length} of {members.length} members
      </p>

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-white/5 text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3 text-right">Total level</th>
              <th className="px-4 py-3 text-right">Total XP</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60">
            {rows.map((m) => (
              <tr key={m.rsn} className="transition hover:bg-white/5">
                <td className="px-4 py-2.5">
                  <Link href={`/members/${encodeURIComponent(m.rsn)}`} className="font-medium hover:text-gold">
                    {m.rsn}
                  </Link>
                  {m.verified && <span title="Linked to a Discord member" className="ml-2 text-xs text-emerald-400">✓</span>}
                </td>
                <td className="px-4 py-2.5">
                  <RankBadge rank={m.rank} color={rankColor(m.rankOrder, maxOrder)} />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.totalLevel ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums" title={full(m.totalXp)}>
                  {compact(m.totalXp)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.points}</td>
                <td className="px-4 py-2.5 text-right text-muted">{shortDate(m.joined)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Nobody matches that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
