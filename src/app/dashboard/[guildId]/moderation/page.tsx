import { ModerationManager } from "@/components/dashboard/ModerationManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { editCaseReasonAction, lookUpCasesAction, saveModerationSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ModerationPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [overview, structure] = await Promise.all([adminApi.moderation(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation cases"
        description="Every ban, kick, timeout and warning is a numbered case. Look one up, fix its reason, and decide what members are told. Bans, kicks and timeouts are done with slash commands, which you turn on from Commands."
      />
      <ModerationManager
        initial={overview}
        roles={structure.roles}
        actions={{ save: saveModerationSettingsAction.bind(null, guildId), editReason: editCaseReasonAction.bind(null, guildId), lookUp: lookUpCasesAction.bind(null, guildId) }}
      />
    </div>
  );
}
