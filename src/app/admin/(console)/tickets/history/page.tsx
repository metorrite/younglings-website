import Link from "next/link";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { formatUtc, ghostButton, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Tickets — Younglings" };

const PAGE_SIZE = 25;
const STATUSES = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function TicketHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin("/admin/tickets/history");
  const query = await searchParams;

  const status = STATUSES.some((s) => s.value === first(query.status)) ? first(query.status)! : "ALL";
  const panel = /^\d+$/.test(first(query.panel) ?? "") ? first(query.panel)! : "";
  const page = Math.max(0, Number.parseInt(first(query.page) ?? "0", 10) || 0);

  const [{ tickets, hasMore }, { panels }] = await Promise.all([
    adminApi.listTickets(admin, { status, panel, limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then(unwrap),
    adminApi.listPanels(admin).then(unwrap),
  ]);

  const link = (change: { status?: string; panel?: string; page?: number }) => {
    const params = new URLSearchParams();
    const nextStatus = change.status ?? status;
    const nextPanel = change.panel ?? panel;
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPanel) params.set("panel", nextPanel);
    if (change.page) params.set("page", String(change.page));
    const qs = params.toString();
    return `/admin/tickets/history${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="mt-1 text-sm text-muted">Newest first. Open a ticket to read its answers and saved transcript.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={link({ status: s.value, page: 0 })}
            className={`rounded-full border px-3 py-1 ${status === s.value ? "border-gold bg-gold/15" : "border-surface-border text-muted hover:text-foreground"}`}
          >
            {s.label}
          </Link>
        ))}
        <span className="mx-2 text-muted">|</span>
        <Link
          href={link({ panel: "", page: 0 })}
          className={`rounded-full border px-3 py-1 ${panel === "" ? "border-gold bg-gold/15" : "border-surface-border text-muted hover:text-foreground"}`}
        >
          Every panel
        </Link>
        {panels.map((p) => (
          <Link
            key={p.id}
            href={link({ panel: p.id, page: 0 })}
            className={`rounded-full border px-3 py-1 ${panel === p.id ? "border-gold bg-gold/15" : "border-surface-border text-muted hover:text-foreground"}`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">No tickets match.</div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/admin/tickets/history/${ticket.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface px-5 py-3 transition hover:border-gold/50"
              >
                <div>
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
            </li>
          ))}
        </ul>
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
