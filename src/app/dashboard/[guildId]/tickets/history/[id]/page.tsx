import { Card, formatUtc, StatusBadge } from "@/components/admin/ui";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ guildId: string; id: string }> }) {
  const { guildId, id } = await params;
  const guild = await requireGuild(guildId);
  const ticket = await adminApi.getTicket(guild, id).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`#${String(ticket.number).padStart(4, "0")} ${ticket.panelName ?? "(deleted panel)"}`}
        description={ticket.status === "OPEN" ? "An open ticket: its answers, and the transcript once it is closed." : "A closed ticket: its answers and saved transcript."}
        actions={<StatusBadge tone={ticket.status === "OPEN" ? "good" : "muted"}>{ticket.status === "OPEN" ? "Open" : "Closed"}</StatusBadge>}
        back={{ href: `/dashboard/${guildId}/tickets/history`, label: "Tickets" }}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Details">
            <dl className="space-y-3 text-sm">
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
        </div>

        <Card title="Transcript" hint={ticket.transcriptMessageCount !== null ? `${ticket.transcriptMessageCount} messages, saved when the ticket was closed.` : undefined}>
          {ticket.transcript ? (
            <pre className="max-h-[40rem] overflow-auto rounded-md border border-surface-border bg-background p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{ticket.transcript}</pre>
          ) : (
            <p className="text-sm text-muted">
              {ticket.status === "OPEN" ? "A transcript is saved when the ticket is closed." : "No transcript is stored for this ticket (it may have passed the retention period)."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
