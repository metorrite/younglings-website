import { KickManager } from "@/components/dashboard/KickManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { addKickStreamerAction, deleteKickStreamerAction, saveKickSettingsAction, saveKickStreamerAction } from "./actions";

export const metadata = { title: "Kick alerts — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function KickPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [kick, structure] = await Promise.all([adminApi.kick(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Kick alerts" description="Post in a channel when a streamer you follow goes live on Kick, with the title, the game and a preview. Off until you switch it on." />
      <KickManager
        initial={kick}
        structure={structure}
        actions={{
          settings: saveKickSettingsAction.bind(null, guildId),
          add: addKickStreamerAction.bind(null, guildId),
          save: saveKickStreamerAction.bind(null, guildId),
          remove: deleteKickStreamerAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
