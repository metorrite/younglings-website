import { PostTool } from "@/components/admin/AdminExtras";
import { AnnouncementsPanels } from "@/components/dashboard/AnnouncementsPanels";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { postGuildMessageAction, saveBanAnnouncementAction, sendAnnouncementAction, testBanAnnouncementAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [structure, ban] = await Promise.all([adminApi.structure(guild).then(dashboardData), adminApi.banAnnouncement(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Post a message"
        description="Write a message and have JonnyBot post it in any channel, with headings, dividers, colours, images and buttons. Check it first, then post. Below: a quick announcement with a ping, and whether JonnyBot announces bans."
      />
      <PostTool {...choicesOf(structure)} post={postGuildMessageAction.bind(null, guildId)} />
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
