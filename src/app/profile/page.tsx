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
import { compact, getOverview, getProfile, rankColor, shortDate } from "@/lib/site";
import { updateColorRoleAction, updateNicknameAction } from "./actions";

export const metadata = { title: "My profile — Younglings" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "server", label: "Server profile", icon: "🎭" },
  { id: "public", label: "Public profile", icon: "🪪" },
  { id: "goals", label: "Goals", icon: "🎯" },
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gold opacity-10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          {user.image && <Image src={user.image} alt="" width={84} height={84} className="rounded-full ring-2 ring-gold/50" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-wide">{member?.nickname || user.name}</h1>
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

        {tab === "notifications" && (
          <Panel title="Notifications" hint="Choose which direct messages JonnyBot may send you.">
            {settings.ok ? <NotificationsForm initial={settings.data} /> : <Unavailable what="Your notification settings" />}
          </Panel>
        )}
      </div>
    </div>
  );
}
