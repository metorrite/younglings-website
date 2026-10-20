import { ServerRemindersManager } from "@/components/dashboard/ServerRemindersManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { cancelServerReminderAction, createServerReminderAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServerRemindersPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [reminders, structure] = await Promise.all([adminApi.serverReminders(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server reminders"
        description="Reminders JonnyBot posts in a channel for everyone, once or on a repeat, with an optional role ping. The same as /serverreminder in Discord."
      />
      <ServerRemindersManager
        initial={reminders}
        structure={structure}
        roles={structure.roles}
        actions={{ create: createServerReminderAction.bind(null, guildId), cancel: cancelServerReminderAction.bind(null, guildId) }}
      />
    </div>
  );
}
