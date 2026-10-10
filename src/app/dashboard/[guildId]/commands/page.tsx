import { HubEditor } from "@/components/dashboard/HubEditor";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveHubCommandAction } from "./actions";

export default async function CommandsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [hub, structure] = await Promise.all([adminApi.hub(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        The slash commands members can use in this server. Open one to turn it off, choose who may use it (admins always can), limit the channels it works in,
        and for Signups fix the admin channel and choose where the public panel can go.
      </p>
      <HubEditor hub={hub} structure={structure} canEditAccess={guild.tier === "ADMIN"} save={saveHubCommandAction.bind(null, guildId)} />
    </div>
  );
}
