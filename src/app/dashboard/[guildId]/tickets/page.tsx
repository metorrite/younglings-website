import { TicketsOverview } from "@/components/dashboard/tickets/TicketsOverview";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

export default async function TicketPanelsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [{ panels }, structure, stats] = await Promise.all([
    adminApi.listPanels(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
    adminApi.ticketStats(guild).then(dashboardData),
  ]);

  return <TicketsOverview guildId={guildId} panels={panels} stats={stats} channels={structure.channels} />;
}
