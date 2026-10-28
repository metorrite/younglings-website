import { PlanCard } from "@/components/dashboard/PlanCard";
import { ServerSetupForm } from "@/components/dashboard/ServerSetupForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveServerSetupAction } from "./actions";

export default async function SettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [setup, structure, plan] = await Promise.all([adminApi.serverSetup(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData), adminApi.premiumGuilds(guild)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server setup"
        description="The basics JonnyBot needs to work in this server. A new server starts empty, so begin with your clan if you have one. Not sure where to start? Try the guided setup."
      />
      <ServerSetupForm initial={setup} structure={structure} save={saveServerSetupAction.bind(null, guildId)} />
      {/* a failed lookup just means no card: the page works without it */}
      {plan.ok && <PlanCard plan={plan.data} />}
    </div>
  );
}
