import Link from "next/link";
import { Card, primaryButton, StatusBadge } from "@/components/admin/ui";
import { BarChart, RankedBars } from "@/components/charts";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { shortDay } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function TicketPanelsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [{ panels }, structure, stats] = await Promise.all([
    adminApi.listPanels(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
    adminApi.ticketStats(guild).then(dashboardData),
  ]);
  const base = `/dashboard/${guildId}/tickets`;
  const duration = (hours: number | null) => (hours === null ? "—" : hours < 1 ? `${Math.round(hours * 60)} min` : hours < 48 ? `${hours.toFixed(1)} hr` : `${(hours / 24).toFixed(1)} days`);
  const channelName = (id: string | null) => structure.channels.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {[
          ["Open", stats.open],
          ["Closed", stats.closed],
          ["Escalated", stats.escalated],
          ["Flagged", stats.flagged],
          ["Avg. time to close", duration(stats.avgHoursToClose)],
          ["Avg. wait for a helper", stats.avgMinutesToFirstHelper === null ? "—" : duration(stats.avgMinutesToFirstHelper / 60)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-surface-border bg-surface p-4">
            <p className="text-xs tracking-wider text-muted uppercase">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {(stats.byWeek.length > 0 || stats.topHelpers.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Tickets opened per week">
            {stats.byWeek.length > 0 ? (
              <BarChart groups={stats.byWeek.map((w) => ({ label: shortDay(w.weekStart), values: [w.opened] }))} series={[{ name: "Opened", color: "#d4af37" }]} height={170} />
            ) : (
              <p className="text-sm text-muted">No tickets yet.</p>
            )}
          </Card>
          <Card title="Most active helpers" hint="By tickets joined.">
            <RankedBars rows={stats.topHelpers.map((h) => ({ label: h.name ?? h.id, value: h.tickets }))} format={(n) => `${n} ticket${n === 1 ? "" : "s"}`} />
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Ticket panels</h2>
          <p className="text-sm text-muted">Each panel is one kind of ticket members can open, with its own form and helpers.</p>
        </div>
        <Link href={`${base}/panels/new`} className={primaryButton}>
          New panel
        </Link>
      </div>

      {panels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
          <p className="font-medium">No panels yet</p>
          <p className="mt-1 text-sm text-muted">A panel is a message with a button. Members press it to open a ticket. Create your first one to get started.</p>
        </div>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {panels.map((panel) => (
            <li key={panel.id}>
              <Link href={`${base}/panels/${panel.id}`} className="flex h-full flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface p-5 transition hover:border-gold/50">
                <div className="min-w-0">
                  <p className="font-semibold">{panel.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {panel.title} · {panel.fieldCount} question{panel.fieldCount === 1 ? "" : "s"}
                    {panel.helperCap !== null ? ` · up to ${panel.helperCap} helpers` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!panel.enabled && <StatusBadge tone="warn">Disabled</StatusBadge>}
                  {panel.postedChannelId ? <StatusBadge tone="good">Posted in #{channelName(panel.postedChannelId) ?? "deleted channel"}</StatusBadge> : <StatusBadge tone="muted">Not posted</StatusBadge>}
                  <StatusBadge tone={panel.openTickets > 0 ? "good" : "muted"}>{panel.openTickets} open</StatusBadge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
