import { STATUSES, TicketHistoryList } from "@/components/dashboard/tickets/TicketHistoryList";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function TicketHistoryPage({ params, searchParams }: { params: Promise<{ guildId: string }>; searchParams: SearchParams }) {
  const { guildId } = await params;
  const query = await searchParams;
  const guild = await requireGuild(guildId);

  const status = STATUSES.some((s) => s.value === first(query.status)) ? first(query.status)! : "ALL";
  const panel = /^\d+$/.test(first(query.panel) ?? "") ? first(query.panel)! : "";
  const page = Math.max(0, Number.parseInt(first(query.page) ?? "0", 10) || 0);

  const [{ tickets, hasMore }, { panels }] = await Promise.all([
    adminApi.listTickets(guild, { status, panel, limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then(dashboardData),
    adminApi.listPanels(guild).then(dashboardData),
  ]);

  return <TicketHistoryList guildId={guildId} status={status} panel={panel} page={page} tickets={tickets} hasMore={hasMore} panels={panels} />;
}
