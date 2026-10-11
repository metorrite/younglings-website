import { AutoDeleteManager } from "@/components/dashboard/AutoDeleteManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteAutoDeleteAction, saveAutoDeleteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutoDeletePage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, structure] = await Promise.all([
    adminApi.autoDelete(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto-delete"
        description="Keep a channel free of Discord invites, links or files: matching messages are deleted the moment they are posted."
      />
      <AutoDeleteManager
        initial={list}
        structure={structure}
        actions={{
          save: saveAutoDeleteAction.bind(null, guildId),
          remove: deleteAutoDeleteAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
