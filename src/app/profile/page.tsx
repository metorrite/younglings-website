import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalsManager, NotificationsForm, PublicProfileForm, SelfRoles } from "@/components/profile/SettingsPanels";
import { Panel, ProgressBar, RankBadge, StatTile, Unavailable } from "@/components/site/blocks";
import { authOptions } from "@/lib/auth";
import { badgesFor } from "@/lib/badges";
import { whoAmI } from "@/lib/jonnybot-admin";
import { COLOR_PALETTE, getMemberInfo } from "@/lib/jonnybot";
import { memberApi } from "@/lib/member";
import { displayName } from "@/lib/names";
import { compact, full, getOverview, getPolls, getProfile, getSignups, rankColor, shortDate } from "@/lib/site";
import { updateColorRoleAction, updateNicknameAction } from "./actions";

export const metadata = { title: "My profile — Younglings" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "server", label: "Server profile", icon: "🎭" },
  { id: "public", label: "Public profile", icon: "🪪" },
  { id: "goals", label: "Goals", icon: "🎯" },
  { id: "activity", label: "My activity", icon: "📋" },
  { id: "coffer", label: "Coffer", icon: "💰" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin?callbackUrl=%2Fprofile");

  const query = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === query.tab) ? (query.tab as TabId) : "overview";
  const { user } = session;

  // Everything below is keyed off the id from the verified session — never from the URL.
  const [member, settings, access] = await Promise.all([getMemberInfo(user.id), memberApi.settings(user.id), whoAmI(user.id)]);
  const isAdmin = access.ok && access.data.allowed;
  const rsns = settings.ok ? settings.data.rsns : [];
  const mine = tab === "overview" && rsns.length > 0 ? await getProfile(rsns[0]) : null;
  const overview = tab === "overview" && mine ? await getOverview() : null;
  const maxOrder = overview ? Math.max(0, ...overview.ranks.map((r) => r.order)) : 11;

  const goals = tab === "goals" || tab === "overview" ? await memberApi.goals(user.id) : null;
  const roles = tab === "server" ? await memberApi.roles(user.id) : null;

  // "My activity": open polls I've voted in and signup sheets I'm on.
  const [polls, myPolls, sheets, mySignups] =
    tab === "activity" ? await Promise.all([getPolls(), memberApi.myPolls(user.id), getSignups(), memberApi.mySignups(user.id)]) : [null, null, null, null];
  const myVotes = polls && myPolls?.ok ? polls.filter((p) => p.active).flatMap((p) => { const mine = myPolls.data.polls.find((m) => m.pollId === p.id)?.mine ?? []; return mine.length ? [{ poll: p, picks: p.options.filter((o) => mine.includes(o.number)) }] : []; }) : [];
  const mySheets = sheets && mySignups?.ok ? sheets.filter((s) => mySignups.data.joined.includes(s.id)) : [];
  const coffer = tab === "coffer" ? await memberApi.myCoffer(user.id) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gold opacity-10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          {user.image && <Image src={user.image} alt="" width={84} height={84} className="rounded-full ring-2 ring-gold/50" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-wide">{displayName(member?.nickname, member?.username ?? user.name)}</h1>
            <p className="mt-0.5 text-sm text-muted">
              @{member?.username ?? user.name}
              {rsns.length > 0 && <> · RuneScape: <span className="text-foreground">{rsns.join(", ")}</span></>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {rsns.length > 0 && (
              <Link href={`/members/${encodeURIComponent(rsns[0])}`} className="rounded-md border border-surface-border px-3 py-1.5 transition hover:border-gold/50">
                View public profile →
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="rounded-md border border-gold/40 px-3 py-1.5 text-gold transition hover:bg-gold/10">
                Admin dashboard →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface/80 p-1 text-sm" aria-label="Profile sections">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "overview" ? "/profile" : `/profile?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${tab === t.id ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground"}`}
          >
            <span>{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {tab === "overview" && (
          <>
            {!settings.ok ? (
              <Unavailable what="Your profile" />
            ) : rsns.length === 0 ? (
              <Panel title="Link your RuneScape name">
                <p className="text-sm text-muted">
                  No RuneScape name is linked to your Discord account yet. Use <code className="rounded bg-white/10 px-1">/rs</code> in the Younglings Discord to link yours — then your stats, badges and goals show up here and on your public profile.
                </p>
              </Panel>
            ) : mine === null ? (
              <Panel title="Your clan profile">
                <p className="text-sm text-muted">
                  <strong className="text-foreground">{rsns[0]}</strong> is linked, but isn&apos;t a current clan member, so there&apos;s no clan profile to show yet.
                </p>
              </Panel>
            ) : (
              <>
                <Panel
                  title="Your clan profile"
                  action={
                    <Link href={`/members/${encodeURIComponent(mine.rsn)}`} className="text-xs text-muted hover:text-gold">
                      Open →
                    </Link>
                  }
                >
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="text-lg font-semibold">{mine.rsn}</span>
                    <RankBadge rank={mine.rank} color={rankColor(mine.rankOrder, maxOrder)} />
                    <span className="text-sm text-muted">since {shortDate(mine.joined)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile label="Total level" value={mine.totalLevel ?? "—"} />
                    <StatTile label="XP this week" value={`+${compact(mine.gains.week)}`} />
                    <StatTile label="Clan points" value={mine.points} />
                    <StatTile label="Citadel caps" value={mine.citadel.caps} />
                  </div>
                  {mine.nextRank && (
                    <div className="mt-5">
                      <ProgressBar value={mine.points} max={mine.nextRank.threshold} />
                      <p className="mt-1.5 text-xs text-muted">
                        {mine.promotionNeeded ? `Eligible for ${mine.nextRank.name} — promotion pending.` : `${mine.nextRank.pointsNeeded} points to ${mine.nextRank.name}.`}
                      </p>
                    </div>
                  )}
                </Panel>

                {(() => {
                  const badges = badgesFor(mine, overview);
                  return badges.length > 0 ? (
                    <Panel title="Your badges" action={<Link href="/hall-of-fame" className="text-xs text-muted hover:text-gold">How to earn more →</Link>}>
                      <ul className="flex flex-wrap gap-2">
                        {badges.map((b) => (
                          <li key={b.id} title={b.description} className="flex items-center gap-1.5 rounded-full border border-surface-border bg-background/60 px-3 py-1.5 text-sm">
                            <span>{b.icon}</span>
                            {b.label}
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  ) : null;
                })()}
              </>
            )}

            {goals?.ok && goals.data.goals.some((g) => !g.achievedAt) && (
              <Panel title="Goals in progress" action={<Link href="/profile?tab=goals" className="text-xs text-muted hover:text-gold">Manage →</Link>}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {goals.data.goals.filter((g) => !g.achievedAt).slice(0, 4).map((g) => (
                    <li key={g.id} className="rounded-lg border border-surface-border/60 bg-background/40 p-3">
                      <p className="text-sm font-medium">
                        {g.skill} <span className="text-muted">→ {g.targetLevel}</span>
                      </p>
                      <div className="mt-2">
                        <ProgressBar value={g.progress * 100} max={100} />
                      </div>
                      <p className="mt-1 text-xs text-muted">{compact(g.xpRemaining)} XP to go</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}

        {tab === "server" && (
          <>
            {member === null ? (
              <Unavailable what="Your server profile" />
            ) : (
              <>
                <Panel title="Server nickname" hint={`What Younglings shows for you instead of ${member.username}.`}>
                  <form action={updateNicknameAction} className="flex gap-2">
                    <input
                      type="text"
                      name="nickname"
                      maxLength={32}
                      defaultValue={member.nickname ?? ""}
                      placeholder={member.username}
                      className="flex-1 rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                    <button type="submit" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
                      Save
                    </button>
                  </form>
                  <p className="mt-2 text-xs text-muted">Leave blank to reset to your Discord username.</p>
                </Panel>

                <Panel title="Name colour" hint="Purely cosmetic — picks which colour your name shows in this server.">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(COLOR_PALETTE).map(([name, hex]) => (
                      <form action={updateColorRoleAction} key={name}>
                        <input type="hidden" name="color" value={name} />
                        <button
                          type="submit"
                          title={name}
                          aria-label={name}
                          className="h-9 w-9 rounded-full transition"
                          style={{ backgroundColor: hex, outline: member.colorRole === name ? "2px solid var(--color-gold)" : "none", outlineOffset: "2px" }}
                        />
                      </form>
                    ))}
                    <form action={updateColorRoleAction}>
                      <input type="hidden" name="color" value="" />
                      <button
                        type="submit"
                        title="Clear"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-xs text-muted transition hover:text-foreground"
                        style={{ outline: member.colorRole === null ? "2px solid var(--color-gold)" : "none", outlineOffset: "2px" }}
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </Panel>
              </>
            )}

            <Panel title="Roles you can pick" hint="Opt in to the roles the server offers — pings, interests and more. Click to add or remove.">
              {roles === null || !roles.ok ? <Unavailable what="Self-assignable roles" /> : <SelfRoles initial={roles.data.roles} />}
            </Panel>
          </>
        )}

        {tab === "public" && (
          <Panel title="Your public profile" hint="What everyone sees on your page in the member list.">
            {settings.ok ? <PublicProfileForm initial={settings.data} /> : <Unavailable what="Your profile settings" />}
          </Panel>
        )}

        {tab === "goals" && (
          <Panel title="Skill goals" hint="Set a target level and track your progress. JonnyBot can DM you when you reach it.">
            {goals?.ok ? <GoalsManager initial={goals.data.goals} hasLink={rsns.length > 0} /> : <Unavailable what="Your goals" />}
          </Panel>
        )}

        {tab === "activity" && (
          <>
            <Panel title="Polls you've voted in" action={<Link href="/polls" className="text-xs text-muted hover:text-gold">All polls →</Link>}>
              {myVotes.length === 0 ? (
                <p className="text-sm text-muted">You haven&apos;t voted in any open polls.</p>
              ) : (
                <ul className="space-y-3">
                  {myVotes.map(({ poll, picks }) => (
                    <li key={poll.id} className="rounded-lg border border-surface-border/60 bg-background/40 p-3">
                      <p className="text-sm font-medium">{poll.title}</p>
                      <p className="mt-1 text-xs text-muted">You picked: <span className="text-foreground">{picks.map((p) => p.label).join(", ")}</span></p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Signups you're on" action={<Link href="/signups" className="text-xs text-muted hover:text-gold">All signups →</Link>}>
              {mySheets.length === 0 ? (
                <p className="text-sm text-muted">You aren&apos;t signed up for anything right now.</p>
              ) : (
                <ul className="space-y-2">
                  {mySheets.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border/60 bg-background/40 px-3 py-2 text-sm">
                      <span className="truncate font-medium">{s.title}</span>
                      <span className="shrink-0 text-xs text-muted">{s.entries.length}{s.max ? ` / ${s.max}` : ""} signed up</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Reminders" action={<Link href="/profile?tab=notifications" className="text-xs text-muted hover:text-gold">Change →</Link>}>
              <p className="text-sm text-muted">
                Event reminders are <strong className="text-foreground">{settings.ok && settings.data.dmEvents ? "on" : "off"}</strong>; goal-reached messages are{" "}
                <strong className="text-foreground">{settings.ok && settings.data.dmGoals ? "on" : "off"}</strong>.
              </p>
            </Panel>
          </>
        )}

        {tab === "coffer" && (
          <Panel title="Your clan coffer" hint="Donations recorded under your linked RuneScape names, and anything you've been given.">
            {coffer === null || !coffer.ok ? (
              <Unavailable what="Your coffer" />
            ) : !coffer.data.linked ? (
              <p className="text-sm text-muted">Link your RuneScape name with <code className="rounded bg-white/10 px-1">/rs</code> in Discord and your donations will show up here.</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="You've donated" value={`${compact(coffer.data.donated)} gp`} sub={`${full(coffer.data.donated)} gp`} />
                  <StatTile label="Your balance" value={`${compact(coffer.data.balance)} gp`} sub="held for you by the clan" />
                </div>
                <div>
                  <p className="mb-2 text-xs tracking-wider text-muted uppercase">Your donations</p>
                  {coffer.data.donations.length === 0 ? (
                    <p className="text-sm text-muted">Nothing recorded yet.</p>
                  ) : (
                    <ul className="divide-y divide-surface-border/60 text-sm">
                      {coffer.data.donations.map((d, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2">
                          <span className="text-muted">{shortDate(d.at)}</span>
                          <span className="font-mono text-gold">{compact(d.amount)} gp</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {coffer.data.giveaways.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs tracking-wider text-muted uppercase">Giveaways you received</p>
                    <ul className="divide-y divide-surface-border/60 text-sm">
                      {coffer.data.giveaways.map((g, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2">
                          <span className="truncate">{g.description || "Giveaway"} <span className="text-xs text-muted">· {shortDate(g.at)}</span></span>
                          <span className="shrink-0 font-mono text-emerald-300">+{compact(g.amount)} gp</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Panel>
        )}

        {tab === "notifications" && (
          <Panel title="Notifications" hint="Choose which direct messages JonnyBot may send you.">
            {settings.ok ? <NotificationsForm initial={settings.data} /> : <Unavailable what="Your notification settings" />}
          </Panel>
        )}
      </div>
    </div>
  );
}
