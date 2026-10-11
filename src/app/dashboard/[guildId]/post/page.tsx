import { PostTool } from "@/components/admin/AdminExtras";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { postGuildMessageAction } from "./actions";

export default async function PostPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const structure = await adminApi.structure(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Post a message" description="Write a message and have JonnyBot post it in any channel, with headings, dividers, colours, images and buttons. Check it first, then post." />
      <PostTool {...choicesOf(structure)} post={postGuildMessageAction.bind(null, guildId)} />
    </div>
  );
}
