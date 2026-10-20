import { MessageLogsForm } from "@/components/dashboard/MessageLogsForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { clearGuildMessageLogsAction, saveGuildMessageLogsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function MessageLogsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [logs, structure] = await Promise.all([adminApi.messageLogs(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Message & voice logs" description="Log edited and deleted messages, and who joins, leaves or moves between voice channels. Off until you switch it on." />
      <MessageLogsForm initial={logs} structure={structure} save={saveGuildMessageLogsAction.bind(null, guildId)} clear={clearGuildMessageLogsAction.bind(null, guildId)} />
    </div>
  );
}
