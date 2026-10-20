import { EventAnnouncerForm } from "@/components/dashboard/EventAnnouncerForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveEventAnnouncerAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EventAnnouncerPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [announcer, structure] = await Promise.all([adminApi.eventAnnouncer(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event announcer"
        description="Post your server's Discord scheduled events in a channel, with an optional “interested” role and a reminder when they start."
      />
      <EventAnnouncerForm initial={announcer} structure={structure} save={saveEventAnnouncerAction.bind(null, guildId)} />
    </div>
  );
}
