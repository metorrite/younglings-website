import { VoiceTextForm } from "@/components/dashboard/VoiceTextForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveVoiceTextAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VoiceTextPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [voiceText, structure] = await Promise.all([adminApi.voiceText(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice text"
        description="Give people a text channel while they are in a voice channel: it opens when they join and closes again when they leave."
      />
      <VoiceTextForm initial={voiceText} structure={structure} save={saveVoiceTextAction.bind(null, guildId)} />
    </div>
  );
}
