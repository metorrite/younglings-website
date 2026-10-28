import { AutopunishEditor } from "@/components/dashboard/AutopunishEditor";
import { WarningsManager } from "@/components/dashboard/WarningsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteWarningAction, saveAutopunishAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function WarningsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, autopunish] = await Promise.all([
    adminApi.warnings(guild).then(dashboardData),
    adminApi.autopunish(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warnings"
        description="The record of warnings given with /warn. Take one back if it was a mistake. The Advanced view adds Autopunish."
      />
      <WarningsManager
        initial={list}
        actions={{ remove: deleteWarningAction.bind(null, guildId) }}
      />
      <AutopunishEditor
        initial={autopunish}
        actions={{ save: saveAutopunishAction.bind(null, guildId) }}
      />
    </div>
  );
}
