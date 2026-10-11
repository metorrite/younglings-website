import { AutoRepliesEditor } from "@/components/dashboard/AutoRepliesEditor";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteGuildAutoReplyAction, saveGuildAutoReplyAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutoresponderPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const replies = await adminApi.autoReplies(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Automatic replies" description="Teach JonnyBot to answer messages on its own, such as common questions. Open a reply to edit it." />
      <AutoRepliesEditor initial={replies} actions={{ save: saveGuildAutoReplyAction.bind(null, guildId), remove: deleteGuildAutoReplyAction.bind(null, guildId) }} />
    </div>
  );
}
