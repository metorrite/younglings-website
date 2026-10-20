import { TwitchManager } from "@/components/dashboard/TwitchManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { addTwitchStreamerAction, deleteTwitchStreamerAction, saveTwitchSettingsAction, saveTwitchStreamerAction } from "./actions";

export const metadata = { title: "Twitch alerts — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function TwitchPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [twitch, structure] = await Promise.all([adminApi.twitch(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Twitch alerts" description="Post in a channel when a streamer you follow goes live on Twitch, with the title, the game and a preview. Off until you switch it on." />
      <TwitchManager
        initial={twitch}
        structure={structure}
        actions={{
          settings: saveTwitchSettingsAction.bind(null, guildId),
          add: addTwitchStreamerAction.bind(null, guildId),
          save: saveTwitchStreamerAction.bind(null, guildId),
          remove: deleteTwitchStreamerAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
