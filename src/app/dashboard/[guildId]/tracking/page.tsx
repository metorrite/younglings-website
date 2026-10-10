import { TrackingEditor } from "@/components/admin/AdminExtras";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildTrackingAction } from "./actions";

export default async function GuildTrackingPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [{ groups }, structure] = await Promise.all([adminApi.tracking(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Where JonnyBot announces each kind of clan event: drops, quests, boss kills, Citadel visits, joins and leaves. Each can post to up to 5 channels. These
        only post for members of the clan you set up, so set your clan first.
      </p>
      <TrackingEditor groups={groups} channels={structure.channels} save={saveGuildTrackingAction.bind(null, guildId)} />
    </div>
  );
}
