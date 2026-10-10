import { ServerSetupForm } from "@/components/dashboard/ServerSetupForm";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveServerSetupAction } from "./actions";

export default async function ServerSetupPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [setup, structure] = await Promise.all([adminApi.serverSetup(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        The basics JonnyBot needs to work in this server. Nothing here is set up for you: a new server starts empty, so begin with your clan if you have one.
      </p>
      <ServerSetupForm initial={setup} structure={structure} canEditStaff={guild.tier === "ADMIN"} save={saveServerSetupAction.bind(null, guildId)} />
    </div>
  );
}
