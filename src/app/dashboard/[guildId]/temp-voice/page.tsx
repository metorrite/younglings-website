import { TempVoiceManager } from "@/components/dashboard/TempVoiceManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { removeTempVoiceHubAction, saveTempVoiceHubAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TempVoicePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const list = await adminApi.tempVoice(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Temporary voice channels"
        description="Members join a hub channel and get a voice channel of their own, which they can rename, limit, lock and share. It is deleted when it is empty."
      />
      <TempVoiceManager
        initial={list}
        actions={{
          save: saveTempVoiceHubAction.bind(null, guildId),
          remove: removeTempVoiceHubAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
