import type { ReactNode } from "react";
import { TicketTabs } from "@/components/dashboard/TicketTabs";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { requireGuild } from "@/lib/dashboard";

/** The Tickets section: a header and its own tabs above whichever page is open. */
export default async function TicketsLayout({ children, params }: { children: ReactNode; params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  await requireGuild(guildId);

  return (
    <div className="space-y-6">
      <PageHeader title="Tickets" description="Private help channels members open from a panel. Set up what each kind of ticket asks, who helps, and where the record is kept." />
      <TicketTabs guildId={guildId} />
      {children}
    </div>
  );
}
