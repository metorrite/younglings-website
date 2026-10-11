import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { TrackingEditor } from "@/components/admin/AdminExtras";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { saveGuildTrackingAction } from "./actions";

export default async function GuildTrackingPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [{ groups }, structure] = await Promise.all([adminApi.tracking(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity announcements" description="Where JonnyBot announces your clan&apos;s activity, taken from members&apos; adventure logs: drops, quests, boss kills and Citadel visits, plus joins and leaves. Each can post to up to 5 channels. These only post for members of the clan you set up, so set your clan first." />
      <TrackingEditor groups={groups} {...choicesOf(structure)} save={saveGuildTrackingAction.bind(null, guildId)} />
    </div>
  );
}
