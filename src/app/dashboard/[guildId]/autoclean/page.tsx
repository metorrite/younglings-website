import { AutoCleanManager } from "@/components/dashboard/AutoCleanManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteAutoCleanAction, previewAutoCleanAction, saveAutoCleanAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutoCleanPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, structure] = await Promise.all([
    adminApi.autoClean(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto-clean"
        description="Channels that tidy themselves: messages older than the age you choose are deleted for good. Narrow it to bots, attachments or some text, and check what it would delete before you save."
      />
      <AutoCleanManager
        initial={list}
        structure={structure}
        actions={{
          save: saveAutoCleanAction.bind(null, guildId),
          preview: previewAutoCleanAction.bind(null, guildId),
          remove: deleteAutoCleanAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
