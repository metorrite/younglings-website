import { ModLogForm } from "@/components/dashboard/ModLogForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildModLogAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ModLogPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [modLog, structure] = await Promise.all([
    adminApi.modLog(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation log"
        description="A record in a channel of bans, unbans and timeouts, with who did it and why."
      />
      <ModLogForm
        initial={modLog}
        structure={structure}
        save={saveGuildModLogAction.bind(null, guildId)}
      />
    </div>
  );
}
