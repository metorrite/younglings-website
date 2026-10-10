import Link from "next/link";
import type { ReactNode } from "react";
import { StatTile } from "@/components/dashboard/overview/StatTile";
import type { Overview, ServerSetup } from "@/lib/jonnybot-admin";

const MANAGE = "rounded-md border border-surface-border px-3 py-1.5 text-sm text-muted transition hover:border-gold hover:text-foreground";

export type FeatureRow = { id: string; label: string; detail: string; done: boolean; href?: string; action?: string; where?: string };

/** The Overview's layout, kept apart from fetching so it can be looked at with made-up numbers. */
export function OverviewView({ base, overview, setup, rows, owner }: { base: string; overview: Overview; setup: Pick<ServerSetup, "clanActive" | "clanName">; rows: FeatureRow[]; owner?: ReactNode }) {
  const doneCount = rows.filter((row) => row.done).length;
  const m = overview.members;

  return (
    <div className="space-y-8">
      <section
        className={`flex flex-wrap items-start gap-3 rounded-lg border p-4 ${overview.health.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/40 bg-red-500/10"}`}
      >
        <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${overview.health.ok ? "bg-emerald-400" : "bg-red-400"}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{overview.health.ok ? "JonnyBot is running normally." : "JonnyBot has a problem."}</p>
          {overview.health.problems.map((problem) => (
            <p key={problem} className="text-sm text-muted">
              {problem}
            </p>
          ))}
          {overview.health.ok && !overview.health.autoPoll && <p className="text-sm text-muted">Automatic updates are off on this bot, so data only updates when someone asks for it.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">At a glance</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        {!setup.clanActive && <p className="text-xs text-muted">Clan member numbers appear here once a clan is set up in Settings.</p>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Features</h2>
            <p className="text-sm text-muted">
              {doneCount} of {rows.length} in use in this server.
            </p>
          </div>
          <Link href={`${base}/settings`} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
            Set up or change something
          </Link>
        </div>
        <ul className="divide-y divide-surface-border rounded-lg border border-surface-border bg-surface">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 p-4">
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${row.done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-muted"}`}
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
              {row.href ? (
                <Link href={row.href} className={MANAGE}>
                  {row.action}
                </Link>
              ) : (
                <span className="text-xs text-muted">{row.where}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {owner}
    </div>
  );
}
