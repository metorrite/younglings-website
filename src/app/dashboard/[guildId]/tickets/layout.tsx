import type { ReactNode } from "react";
import { TicketsChrome } from "@/components/dashboard/TicketTabs";
import { requireGuild } from "@/lib/dashboard";

/** The Tickets section: a header and its own tabs above whichever page is open. */
export default async function TicketsLayout({ children, params }: { children: ReactNode; params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  await requireGuild(guildId);

  return (
    <div className="space-y-6">
      <TicketsChrome guildId={guildId} />
      {children}
    </div>
  );
}
