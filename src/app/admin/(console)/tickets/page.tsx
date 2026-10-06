import Link from "next/link";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { BarChart, RankedBars } from "@/components/charts";
import { Card, primaryButton, StatusBadge } from "@/components/admin/ui";
import { shortDay } from "@/lib/site";

export const metadata = { title: "Ticket panels — Younglings" };

export default async function TicketPanelsPage() {
  const admin = await requireAdmin("/admin/tickets");
  const [{ panels }, structure, stats] = await Promise.all([adminApi.listPanels(admin).then(unwrap), adminApi.structure(admin).then(unwrap), adminApi.ticketStats(admin).then(unwrap)]);
  const duration = (hours: number | null) => (hours === null ? "—" : hours < 1 ? `${Math.round(hours * 60)} min` : hours < 48 ? `${hours.toFixed(1)} hr` : `${(hours / 24).toFixed(1)} days`);
  const channelName = (id: string | null) => structure.channels.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ticket panels</h1>
          <p className="mt-1 text-sm text-muted">Each panel is one kind of ticket members can open, with its own form and helpers.</p>
        </div>
        <Link href="/admin/tickets/panels/new" className={primaryButton}>
          New panel
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          ["Open", stats.open],
          ["Closed", stats.closed],
          ["Escalated", stats.escalated],
          ["Flagged", stats.flagged],
          ["Avg. time to close", duration(stats.avgHoursToClose)],
          ["Avg. wait for a helper", stats.avgMinutesToFirstHelper === null ? "—" : duration(stats.avgMinutesToFirstHelper / 60)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs tracking-wider text-muted uppercase">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
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

      {panels.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No panels yet. Create one to get started.
        </div>
      ) : (
        <ul className="space-y-3">
          {panels.map((panel) => (
            <li key={panel.id}>
              <Link
                href={`/admin/tickets/panels/${panel.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface p-5 transition hover:border-gold/50"
              >
                <div>
                  <p className="font-semibold">{panel.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {panel.title} · {panel.fieldCount} question{panel.fieldCount === 1 ? "" : "s"}
                    {panel.helperCap !== null ? ` · up to ${panel.helperCap} helpers` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!panel.enabled && <StatusBadge tone="warn">Disabled</StatusBadge>}
                  {panel.postedChannelId ? (
                    <StatusBadge tone="good">Posted in #{channelName(panel.postedChannelId) ?? "deleted channel"}</StatusBadge>
                  ) : (
                    <StatusBadge tone="muted">Not posted</StatusBadge>
                  )}
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
