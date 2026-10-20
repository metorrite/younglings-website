import { AnnouncementsPanels } from "@/components/dashboard/AnnouncementsPanels";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { saveBanAnnouncementAction, sendAnnouncementAction, testBanAnnouncementAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [ban, structure] = await Promise.all([adminApi.banAnnouncement(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Post a message to a channel yourself, and choose whether JonnyBot announces bans. Joins and leaves have their own pages: Welcome message and Goodbye message." />
      <AnnouncementsPanels
        ban={ban}
        roles={structure.roles}
        {...choicesOf(structure)}
        actions={{
          saveBan: saveBanAnnouncementAction.bind(null, guildId),
          testBan: testBanAnnouncementAction.bind(null, guildId),
          send: sendAnnouncementAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
