import Link from "next/link";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { Card, formatUtc, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Ticket — Younglings" };

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin(`/admin/tickets/history/${encodeURIComponent(id)}`);
  const ticket = unwrap(await adminApi.getTicket(admin, id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tickets/history" className="text-sm text-muted hover:text-foreground">
          ← Tickets
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            <span className="font-mono text-muted">#{String(ticket.number).padStart(4, "0")}</span> {ticket.panelName ?? "(deleted panel)"}
          </h1>
          <StatusBadge tone={ticket.status === "OPEN" ? "good" : "muted"}>{ticket.status === "OPEN" ? "Open" : "Closed"}</StatusBadge>
        </div>
      </div>

      <Card>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <Item label="Opened by" value={ticket.requesterName ?? ticket.requesterId} />
          <Item label="Opened" value={formatUtc(ticket.createdAt)} />
          {ticket.routingLabel && <Item label="Type" value={ticket.routingLabel} />}
          <Item label="Helpers" value={ticket.helpers.length ? ticket.helpers.map((h) => h.name ?? h.id).join(", ") : "None"} />
          {ticket.escalatedAt && <Item label="Escalated" value={formatUtc(ticket.escalatedAt)} />}
          {ticket.closedAt && <Item label="Closed" value={`${formatUtc(ticket.closedAt)}${ticket.closedByName ? ` by ${ticket.closedByName}` : ""}`} />}
          {ticket.closeReason && <Item label="Close reason" value={ticket.closeReason} />}
        </dl>
      </Card>

      {ticket.answers.length > 0 && (
        <Card title="Answers">
          {ticket.answers.map((answer, index) => (
            <div key={index}>
              <p className="text-sm font-medium">{answer.label}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{answer.answer || "—"}</p>
            </div>
          ))}
        </Card>
      )}

      <Card
        title="Transcript"
        hint={ticket.transcriptMessageCount !== null ? `${ticket.transcriptMessageCount} messages, saved when the ticket was closed.` : undefined}
      >
        {ticket.transcript ? (
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md border border-surface-border bg-background p-4 font-mono text-xs leading-relaxed">
            {ticket.transcript}
          </pre>
        ) : (
          <p className="text-sm text-muted">
            {ticket.status === "OPEN" ? "A transcript is saved when the ticket is closed." : "No transcript is stored for this ticket (it may have passed the retention period)."}
          </p>
        )}
      </Card>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
