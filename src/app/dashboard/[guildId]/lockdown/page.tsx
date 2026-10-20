import { LockdownManager } from "@/components/dashboard/LockdownManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { endLockdownAction, lockChannelAction, saveLockdownSetAction, startLockdownAction, unlockChannelAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LockdownPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [lockdown, structure] = await Promise.all([adminApi.lockdown(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lockdown"
        description="Stop everyone but chosen roles from talking in a channel, or in a saved set of channels at once, and put the permissions back exactly as they were."
      />
      <LockdownManager
        initial={lockdown}
        structure={structure}
        canEdit={guild.tier === "ADMIN"}
        actions={{
          save: saveLockdownSetAction.bind(null, guildId),
          lock: lockChannelAction.bind(null, guildId),
          unlock: unlockChannelAction.bind(null, guildId),
          start: startLockdownAction.bind(null, guildId),
          end: endLockdownAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
