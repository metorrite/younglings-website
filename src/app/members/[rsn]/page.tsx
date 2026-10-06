import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart, DonutChart, LineChart, PALETTE } from "@/components/charts";
import { Panel, ProgressBar, RankBadge, StatTile, Unavailable } from "@/components/site/blocks";
import { Tabbed } from "@/components/site/Tabbed";
import { compact, full, getOverview, getProfile, rankColor, shortDate, shortDay, type MemberProfile } from "@/lib/site";

// Rendered per request: the data comes from the bot over a private network that doesn't exist at build time,
// so prerendering would bake in an empty "unavailable" page. The fetches themselves are still cached briefly.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ rsn: string }> }) {
  const { rsn } = await params;
  return { title: `${decodeURIComponent(rsn)} — Younglings` };
}

/** The Wednesdays (Citadel week starts) for the last `count` weeks, oldest first, as YYYY-MM-DD. */
function citadelWeekStarts(count: number): string[] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sinceWednesday = (today.getUTCDay() + 4) % 7; // days since the most recent Wednesday
  const current = new Date(today.getTime() - sinceWednesday * 86_400_000);
  return Array.from({ length: count }, (_, i) => new Date(current.getTime() - (count - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10));
}

function GainBlock({ profile, period }: { profile: MemberProfile; period: "day" | "week" | "month" }) {
  const gains = profile.skillGains[period];
  const total = gains.reduce((sum, g) => sum + g.xp, 0);
  if (gains.length === 0) return <p className="py-6 text-sm text-muted">No XP gained in this period.</p>;

  const top = gains.slice(0, 7);
  const other = gains.slice(7).reduce((sum, g) => sum + g.xp, 0);
  const slices = [...top.map((g) => ({ label: g.skill, value: g.xp })), ...(other > 0 ? [{ label: "Other skills", value: other, color: "#4b5563" }] : [])];
  return (
    <DonutChart
      slices={slices}
      center={
        <>
          <span className="text-xl font-bold">{compact(total)}</span>
          <span className="text-[11px] text-muted">XP gained</span>
        </>
      }
    />
  );
}

export default async function MemberPage({ params }: { params: Promise<{ rsn: string }> }) {
  const { rsn: rawRsn } = await params;
  const rsn = decodeURIComponent(rawRsn);
  const [profile, overview] = await Promise.all([getProfile(rsn), getOverview()]);

  if (profile === null) {
    // Either the bot is unreachable or this isn't a current member; tell the two apart with a cheap second call.
    if (overview === null) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16">
          <Unavailable what="This profile" />
        </div>
      );
    }
    notFound();
  }

  const maxOrder = overview ? Math.max(0, ...overview.ranks.map((r) => r.order)) : 11;
  const color = rankColor(profile.rankOrder, maxOrder);

  const history = profile.history;
  const dailyGains = history.slice(1).map((p, i) => ({ label: shortDay(p.date), value: Math.max(0, p.totalXp - history[i].totalXp) })).slice(-14);

  const weeks = citadelWeekStarts(12);
  const capped = new Set(profile.citadel.cappedWeeks);

  const nextRank = profile.nextRank;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <Link href="/members" className="text-sm text-muted hover:text-foreground">
        ← All members
      </Link>

      <section className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: color }} />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-wide">{profile.rsn}</h1>
              <RankBadge rank={profile.rank} color={color} />
              {profile.verified && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">✓ Verified on Discord</span>}
            </div>
            <p className="mt-2 text-sm text-muted">
              {profile.joinedExact ? "Joined the clan" : "In the clan since about"} {shortDate(profile.joined)}
              {profile.lastPolled && <> · stats updated {shortDate(profile.lastPolled)}</>}
            </p>
          </div>

          <div className="w-full max-w-xs sm:w-72">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted">Clan points</span>
              <span className="text-lg font-semibold">{full(profile.points)}</span>
            </div>
            {nextRank ? (
              <>
                <div className="mt-2">
                  <ProgressBar value={profile.points} max={nextRank.threshold} color={color} />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {profile.promotionNeeded ? `Eligible for ${nextRank.name} — promotion pending` : `${full(nextRank.pointsNeeded)} to ${nextRank.name}`}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-xs text-muted">Top rank reached.</p>
            )}
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total level" value={profile.totalLevel ?? "—"} />
          <StatTile label="Total XP" value={compact(profile.totalXp)} sub={full(profile.totalXp)} />
          <StatTile label="Combat level" value={profile.combatLevel ?? "—"} />
          <StatTile label="Quests complete" value={profile.questsComplete ?? "—"} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Gained · 24 hours" value={`+${compact(profile.gains.day)}`} />
        <StatTile label="Gained · 7 days" value={`+${compact(profile.gains.week)}`} />
        <StatTile label="Gained · 30 days" value={`+${compact(profile.gains.month)}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Total XP — last 90 days">
          <LineChart points={history.map((p) => ({ label: shortDay(p.date), value: p.totalXp }))} />
        </Panel>
        <Panel title="Daily XP gained — last 14 days">
          {dailyGains.length > 0 ? (
            <BarChart groups={dailyGains.map((d) => ({ label: d.label, values: [d.value] }))} series={[{ name: "XP gained", color: "#5aa9e6" }]} />
          ) : (
            <p className="py-8 text-center text-sm text-muted">Not enough history yet.</p>
          )}
        </Panel>
      </div>

      <Panel title="Where the XP went">
        <Tabbed
          initial="week"
          tabs={(["day", "week", "month"] as const).map((period) => ({
            id: period,
            label: period === "day" ? "24 hours" : period === "week" ? "7 days" : "30 days",
            content: <GainBlock profile={profile} period={period} />,
          }))}
        />
      </Panel>

      <Panel title="Skills">
        {profile.skills.length === 0 ? (
          <p className="text-sm text-muted">No skill data has been recorded for this member yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profile.skills.map((skill, i) => (
              <li key={skill.id} className="flex items-center gap-3 rounded-lg border border-surface-border/60 bg-background/40 px-3 py-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold" style={{ backgroundColor: `${PALETTE[i % PALETTE.length]}22`, color: PALETTE[i % PALETTE.length] }}>
                  {skill.level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{skill.name}</span>
                  <span className="block text-xs text-muted">{compact(skill.xp)} XP{skill.rank > 0 ? ` · rank ${full(skill.rank)}` : ""}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Citadel">
          <div className="flex gap-6">
            <div>
              <p className="text-3xl font-bold text-gold">{profile.citadel.caps}</p>
              <p className="text-xs text-muted">caps recorded</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{profile.citadel.visits}</p>
              <p className="text-xs text-muted">visits recorded</p>
            </div>
          </div>
          <p className="mt-5 mb-2 text-xs text-muted">Last 12 Citadel weeks (oldest to newest)</p>
          <div className="flex gap-1.5" aria-label="Weeks capped">
            {weeks.map((week) => (
              <span
                key={week}
                title={`Week of ${shortDay(week)} — ${capped.has(week) ? "capped" : "no cap recorded"}`}
                className={`h-7 flex-1 rounded ${capped.has(week) ? "bg-gold" : "bg-white/10"}`}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Adventure log">
          {profile.activities.length === 0 ? (
            <p className="text-sm text-muted">Nothing recorded yet — the log is public only if the player&apos;s RuneMetrics profile is.</p>
          ) : (
            <ol className="max-h-96 space-y-3 overflow-y-auto pr-2">
              {profile.activities.map((a, i) => (
                <li key={i} className="border-l-2 border-gold/40 pl-3">
                  <p className="text-sm font-medium">{a.text}</p>
                  {a.details && <p className="text-xs text-muted">{a.details}</p>}
                  <p className="mt-0.5 text-[11px] text-muted/80">{a.date}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
