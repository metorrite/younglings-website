import Link from "next/link";
import { MultiLineChart } from "@/components/charts";
import { Panel, RankBadge, Unavailable } from "@/components/site/blocks";
import { SkillIcon } from "@/components/site/SkillIcon";
import { compact, full, getProfile, getRoster, rankColor, shortDate, shortDay, type MemberProfile } from "@/lib/site";

export const metadata = { title: "Compare members — Younglings" };
// Rendered per request (the bot's data isn't reachable at build time); the fetches are cached for a few minutes.
export const dynamic = "force-dynamic";

const A_COLOR = "#d4af37";
const B_COLOR = "#5aa9e6";

type Params = Promise<{ [key: string]: string | string[] | undefined }>;
const text = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

/** XP gained since each date, so two members with very different totals can be compared on growth. */
function growthSeries(a: MemberProfile, b: MemberProfile) {
  const dates = [...new Set([...a.history, ...b.history].map((p) => p.date))].sort();
  const lookup = (profile: MemberProfile) => {
    const byDate = new Map(profile.history.map((p) => [p.date, p.totalXp]));
    const base = profile.history[0]?.totalXp ?? 0;
    return dates.map((d) => (byDate.has(d) ? (byDate.get(d)! - base) : null));
  };
  return { labels: dates.map(shortDay), a: lookup(a), b: lookup(b) };
}

function Row({ label, a, b, format = full, higherIsBetter = true }: { label: string; a: number | null; b: number | null; format?: (n: number) => string; higherIsBetter?: boolean }) {
  const aWins = a !== null && b !== null && a !== b && (higherIsBetter ? a > b : a < b);
  const bWins = a !== null && b !== null && a !== b && (higherIsBetter ? b > a : b < a);
  const cell = (value: number | null, wins: boolean, align: string) => (
    <td className={`px-4 py-2 ${align} tabular-nums ${wins ? "font-semibold text-gold" : ""}`}>{value === null ? "—" : format(value)}</td>
  );
  return (
    <tr className="border-t border-surface-border/60">
      {cell(a, aWins, "text-right")}
      <td className="px-4 py-2 text-center text-xs tracking-wider text-muted uppercase">{label}</td>
      {cell(b, bWins, "text-left")}
    </tr>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: Params }) {
  const query = await searchParams;
  const nameA = text(query.a);
  const nameB = text(query.b);

  const [roster, a, b] = await Promise.all([getRoster(), nameA ? getProfile(nameA) : null, nameB ? getProfile(nameB) : null]);
  const maxOrder = roster ? Math.max(0, ...roster.ranks.map((r) => r.order)) : 11;
  const both = a && b;

  const skillRows = both
    ? a.skills.map((skill) => ({ skill, other: b.skills.find((s) => s.id === skill.id) ?? null }))
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-wide text-gold">Compare members</h1>
        <p className="mt-1 text-sm text-muted">Put two members side by side: stats, gains, skills and how fast each has been growing.</p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-surface-border bg-surface/90 p-4">
        <label className="min-w-48 flex-1 text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-wider uppercase" style={{ color: A_COLOR }}>First member</span>
          <input name="a" list="roster" defaultValue={nameA} placeholder="Start typing a name…" className="w-full rounded-md border border-surface-border bg-background px-3 py-2 outline-none focus:border-gold" />
        </label>
        <label className="min-w-48 flex-1 text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-wider uppercase" style={{ color: B_COLOR }}>Second member</span>
          <input name="b" list="roster" defaultValue={nameB} placeholder="Start typing a name…" className="w-full rounded-md border border-surface-border bg-background px-3 py-2 outline-none focus:border-gold" />
        </label>
        <button type="submit" className="rounded-md bg-gold px-5 py-2 text-sm font-semibold text-background transition hover:brightness-110">
          Compare
        </button>
        <datalist id="roster">
          {roster?.members.map((m) => <option key={m.rsn} value={m.rsn} />)}
        </datalist>
      </form>

      {!nameA && !nameB && <p className="text-center text-sm text-muted">Choose two members above to compare them. You can also start from any member&apos;s profile.</p>}

      {(nameA || nameB) && roster === null && <Unavailable what="The comparison" />}

      {roster !== null && ((nameA && !a) || (nameB && !b)) && (
        <p className="rounded-lg border border-dashed border-surface-border p-4 text-center text-sm text-muted">
          {nameA && !a && <>No current member named “{nameA}”. </>}
          {nameB && !b && <>No current member named “{nameB}”. </>}
          Pick names from the suggestions.
        </p>
      )}

      {both && (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            {[
              { p: a, color: A_COLOR },
              { p: b, color: B_COLOR },
            ].map(({ p, color }) => (
              <Link key={p.rsn} href={`/members/${encodeURIComponent(p.rsn)}`} className="rounded-xl border bg-surface/90 p-5 transition hover:brightness-110" style={{ borderColor: `${color}66` }}>
                <p className="text-xl font-bold" style={{ color }}>{p.rsn}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <RankBadge rank={p.rank} color={rankColor(p.rankOrder, maxOrder)} />
                  <span>since {shortDate(p.joined)}</span>
                </div>
              </Link>
            ))}
          </section>

          <Panel title="Side by side">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <Row label="Total level" a={a.totalLevel} b={b.totalLevel} />
                  <Row label="Total XP" a={a.totalXp} b={b.totalXp} format={compact} />
                  <Row label="Combat level" a={a.combatLevel} b={b.combatLevel} />
                  <Row label="Quests complete" a={a.questsComplete} b={b.questsComplete} />
                  <Row label="Clan points" a={a.points} b={b.points} />
                  <Row label="XP · 24 hours" a={a.gains.day} b={b.gains.day} format={compact} />
                  <Row label="XP · 7 days" a={a.gains.week} b={b.gains.week} format={compact} />
                  <Row label="XP · 30 days" a={a.gains.month} b={b.gains.month} format={compact} />
                  <Row label="Citadel caps" a={a.citadel.caps} b={b.citadel.caps} />
                  <Row label="Citadel visits" a={a.citadel.visits} b={b.citadel.visits} />
                </tbody>
              </table>
            </div>
          </Panel>

          {(() => {
            const growth = growthSeries(a, b);
            return (
              <Panel title="XP gained over the last 90 days">
                <MultiLineChart
                  labels={growth.labels}
                  series={[
                    { name: a.rsn, color: A_COLOR, values: growth.a },
                    { name: b.rsn, color: B_COLOR, values: growth.b },
                  ]}
                />
              </Panel>
            );
          })()}

          <Panel title="Skill by skill">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs tracking-wider text-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 text-right" style={{ color: A_COLOR }}>{a.rsn}</th>
                    <th className="px-3 py-2 text-center">Skill</th>
                    <th className="px-3 py-2 text-left" style={{ color: B_COLOR }}>{b.rsn}</th>
                  </tr>
                </thead>
                <tbody>
                  {skillRows.map(({ skill, other }) => {
                    const aXp = skill.xp;
                    const bXp = other?.xp ?? 0;
                    return (
                      <tr key={skill.id} className="border-t border-surface-border/60">
                        <td className={`px-3 py-1.5 text-right tabular-nums ${aXp > bXp ? "font-semibold text-gold" : "text-muted"}`}>
                          {skill.level} <span className="text-xs">· {compact(aXp)}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs tracking-wider uppercase">
                          <span className="inline-flex items-center gap-1.5">
                            <SkillIcon name={skill.name} size={18} />
                            {skill.name}
                          </span>
                        </td>
                        <td className={`px-3 py-1.5 text-left tabular-nums ${bXp > aXp ? "font-semibold text-gold" : "text-muted"}`}>
                          {other ? <>{other.level} <span className="text-xs">· {compact(bXp)}</span></> : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
