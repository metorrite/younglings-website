import { CommunitySettingsForm } from "@/components/admin/AdminExtras";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { saveGuildCommunityAction } from "./actions";

export default async function CommunityPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [settings, structure] = await Promise.all([adminApi.community(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Polls & signups" description="Where member polls are posted, and what members can start themselves." />
      <CommunitySettingsForm pollChannelId={settings.pollChannelId} {...choicesOf(structure)} save={saveGuildCommunityAction.bind(null, guildId)} />
    </div>
  );
}
