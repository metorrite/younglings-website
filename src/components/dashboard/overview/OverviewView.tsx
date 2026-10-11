import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/dashboard/shell/icons";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { StatTile } from "@/components/dashboard/overview/StatTile";
import type { Overview, ServerSetup } from "@/lib/jonnybot-admin";

const MANAGE = "shrink-0 rounded-md border border-surface-border px-3 py-1.5 text-sm text-muted transition hover:border-gold hover:text-foreground";

export type FeatureRow = { id: string; label: string; detail: string; done: boolean; href?: string; action?: string; where?: string };

/** The Overview's layout, kept apart from fetching so it can be looked at with made-up numbers. */
export function OverviewView({ base, overview, setup, rows, owner, checkup }: { base: string; overview: Overview; setup: Pick<ServerSetup, "clanActive" | "clanName">; rows: FeatureRow[]; owner?: ReactNode; checkup?: { errors: number; warnings: number; checked: number } | null }) {
  const doneCount = rows.filter((row) => row.done).length;
  const percent = rows.length === 0 ? 0 : Math.round((doneCount / rows.length) * 100);
  const m = overview.members;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="How JonnyBot is doing in this server, and what is left to set up."
        actions={
          <Link href={`${base}/guide`} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
            Guided setup
          </Link>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`flex items-start gap-3 rounded-xl border p-5 ${overview.health.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/40 bg-red-500/10"}`}>
          <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${overview.health.ok ? "bg-emerald-400" : "bg-red-400"}`} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{overview.health.ok ? "JonnyBot is running normally" : "JonnyBot has a problem"}</p>
            {overview.health.problems.map((problem) => (
              <p key={problem} className="text-sm text-muted">
                {problem}
              </p>
            ))}
            {overview.health.ok && !overview.health.autoPoll && <p className="text-sm text-muted">Automatic updates are off on this bot, so data only updates when someone asks for it.</p>}
            {overview.health.ok && overview.health.autoPoll && <p className="text-sm text-muted">Everything is connected and updating on its own.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">Setup progress</p>
            <p className="text-sm text-muted">
              {doneCount} of {rows.length} in use
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">{percent === 100 ? "Everything is set up." : "Open a feature below to set it up, or run the guided setup."}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">At a glance</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
          {setup.clanActive && (
            <>
              <StatTile label="Clan members" value={m.rosterSize} hint={`Tracking ${setup.clanName}`} />
              <StatTile label="Linked to Discord" value={m.linked} hint={`of ${m.rosterSize} clan members`} tone={m.unverified === 0 ? "good" : "gold"} />
              <StatTile label="Not linked" value={m.unverified} tone={m.unverified === 0 ? "good" : "gold"} />
              <StatTile label="Promotions due" value={m.promotionsDue} tone={m.promotionsDue === 0 ? "good" : "gold"} />
              <StatTile label="Stale data" value={m.stale} hint="Not refreshed for a while" tone={m.stale === 0 ? "good" : "gold"} />
              <StatTile label="Inactive 30+ days" value={m.inactive} tone={m.inactive === 0 ? "good" : "gold"} />
            </>
          )}
          <StatTile label="Discord members" value={m.discordMembers} />
          {overview.tickets && (
            <StatTile
              label="Open tickets"
              value={overview.tickets.open}
              hint={overview.tickets.escalated > 0 ? `${overview.tickets.escalated} escalated` : undefined}
              tone={overview.tickets.open === 0 ? "good" : "gold"}
            />
          )}
          <StatTile label="Open signups" value={overview.community.openSignups} />
          <StatTile label="Open polls" value={overview.community.openPolls} />
          <StatTile label="Bot" value={overview.health.ok ? "Healthy" : "Check health"} tone={overview.health.ok ? "good" : "bad"} />
        </div>
        {!setup.clanActive && <p className="text-xs text-muted">Clan member numbers appear here once a clan is set up in Server setup.</p>}
      </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Features</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => (
              <li key={row.id} className={`flex flex-col gap-3 rounded-xl border p-4 ${row.done ? "border-surface-border bg-surface" : "border-dashed border-surface-border bg-surface/50"}`}>
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${row.done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-muted"}`}
                  >
                    {row.done ? "✓" : "○"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {row.label}
                      <span className="sr-only">{row.done ? " (set up)" : " (not set up)"}</span>
                    </p>
                    <p className="text-sm text-muted">{row.detail}</p>
                  </div>
                </div>
                {row.href ? (
                  <Link href={row.href} className={`${MANAGE} self-start`}>
                    {row.action}
                  </Link>
                ) : (
                  <span className="text-xs text-muted">{row.where}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

        <aside className="space-y-4 xl:sticky xl:top-4">
          {checkup && (
            <Link
              href={`${base}/checkup`}
              className={`block rounded-xl border p-5 transition hover:border-gold ${checkup.errors > 0 ? "border-red-500/40 bg-red-500/10" : checkup.warnings > 0 ? "border-amber-500/40 bg-amber-500/10" : "border-surface-border bg-surface"}`}
            >
              <p className="font-semibold text-gold">Checkup</p>
              <p className="mt-1 text-sm">
                {checkup.checked === 0
                  ? "Nothing set up to check yet."
                  : checkup.errors > 0
                    ? `${checkup.errors} thing${checkup.errors === 1 ? "" : "s"} need${checkup.errors === 1 ? "s" : ""} fixing.`
                    : checkup.warnings > 0
                      ? `${checkup.warnings} thing${checkup.warnings === 1 ? " is" : "s are"} worth a look.`
                      : "No permission or role problems found."}
              </p>
              <p className="mt-2 text-xs text-muted">Open the checkup →</p>
            </Link>
          )}
          <section className="rounded-xl border border-surface-border bg-surface p-5">
            <h2 className="font-semibold text-gold">Quick links</h2>
            <ul className="mt-3 space-y-1">
              {[
                { label: "Server setup", path: "/settings", icon: "sliders" as const },
                { label: "Roles & permissions", path: "/permissions", icon: "shield" as const },
                { label: "Commands", path: "/commands", icon: "terminal" as const },
                { label: "Welcome message", path: "/welcome", icon: "smile" as const },
              ].map((link) => (
                <li key={link.path}>
                  <Link href={`${base}${link.path}`} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-foreground">
                    <Icon name={link.icon} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {owner}
        </aside>
      </div>
    </div>
  );
}
