import { FeedsManager } from "@/components/dashboard/FeedsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteFeedAction, saveFeedAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FeedsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, structure] = await Promise.all([
    adminApi.feeds(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feeds"
        description="Post new YouTube videos and Reddit posts in a channel as they appear."
      />
      <FeedsManager
        initial={list}
        structure={structure}
        actions={{
          save: saveFeedAction.bind(null, guildId),
          remove: deleteFeedAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
