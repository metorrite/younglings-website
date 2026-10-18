import Link from "next/link";
import { formatUtc, ghostButton, StatusBadge } from "@/components/admin/ui";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { Advanced, MoreInAdvanced } from "@/components/dashboard/ui/ViewMode";
import type { PanelSummary, TicketRow } from "@/lib/jonnybot-admin";

export const STATUSES = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

/** The tickets of a server, newest first, with the status filter and (in the Advanced view) the panel filter. */
export function TicketHistoryList({
  guildId,
  status,
  panel,
  page,
  tickets,
  hasMore,
  panels,
}: {
  guildId: string;
  status: string;
  panel: string;
  page: number;
  tickets: TicketRow[];
  hasMore: boolean;
  panels: PanelSummary[];
}) {
  const base = `/dashboard/${guildId}/tickets/history`;

  const link = (change: { status?: string; panel?: string; page?: number }) => {
    const params = new URLSearchParams();
    const nextStatus = change.status ?? status;
    const nextPanel = change.panel ?? panel;
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPanel) params.set("panel", nextPanel);
    if (change.page) params.set("page", String(change.page));
    const qs = params.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };
  const chip = (on: boolean) => `rounded-full border px-3 py-1 transition ${on ? "border-gold bg-gold/15" : "border-surface-border text-muted hover:text-foreground"}`;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Newest first. Open a ticket to read its answers and saved transcript.</p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {STATUSES.map((s) => (
          <Link key={s.value} href={link({ status: s.value, page: 0 })} className={chip(status === s.value)}>
            {s.label}
          </Link>
        ))}
        {(panel !== "" || panels.length > 1) && (
          <Advanced>
            <span className="mx-2 text-muted">|</span>
            <Link href={link({ panel: "", page: 0 })} className={chip(panel === "")}>
              Every panel
            </Link>
            {panels.map((p) => (
              <Link key={p.id} href={link({ panel: p.id, page: 0 })} className={chip(panel === p.id)}>
                {p.name}
              </Link>
            ))}
          </Advanced>
        )}
      </div>
      {panel === "" && panels.length > 1 && <MoreInAdvanced>filtering the tickets by panel.</MoreInAdvanced>}

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No tickets match.</div>
      ) : (
        <PanelGrid min="24rem" gap="gap-2">
          {tickets.map((ticket) => (
              <Link key={ticket.id} href={`${base}/${ticket.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface px-5 py-3 transition hover:border-gold/50">
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="font-mono text-muted">#{String(ticket.number).padStart(4, "0")}</span> {ticket.panelName ?? "(deleted panel)"}
                    {ticket.routingLabel ? <span className="text-muted"> · {ticket.routingLabel}</span> : null}
                  </p>
                  <p className="text-sm text-muted">
                    {ticket.requesterName ?? ticket.requesterId} · opened {formatUtc(ticket.createdAt)}
                  </p>
                </div>
                <StatusBadge tone={ticket.status === "OPEN" ? "good" : "muted"}>{ticket.status === "OPEN" ? "Open" : "Closed"}</StatusBadge>
              </Link>
          ))}
        </PanelGrid>
      )}

      <div className="flex items-center gap-3">
        {page > 0 && (
          <Link href={link({ page: page - 1 })} className={ghostButton}>
            ← Newer
          </Link>
        )}
        {hasMore && (
          <Link href={link({ page: page + 1 })} className={ghostButton}>
            Older →
          </Link>
        )}
      </div>
    </div>
  );
}
