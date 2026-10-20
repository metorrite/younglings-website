import { TicketFlagsPage } from "@/components/dashboard/TicketFlags";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { addTicketFlagAction, deleteTicketFlagAction, setTicketFlagsEnabledAction } from "./actions";

export const metadata = { title: "Ticket flags — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function TicketFlagsRoute({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const flags = await adminApi.ticketFlags(guild).then(dashboardData);

  return (
    <TicketFlagsPage
      initial={flags}
      guildId={guildId}
      actions={{ setEnabled: setTicketFlagsEnabledAction.bind(null, guildId), add: addTicketFlagAction.bind(null, guildId), remove: deleteTicketFlagAction.bind(null, guildId) }}
    />
  );
}
