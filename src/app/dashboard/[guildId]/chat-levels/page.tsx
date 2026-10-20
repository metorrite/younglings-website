import { ChatLevelsBoard } from "@/components/dashboard/ChatLevelsBoard";
import { ChatLevelsForm } from "@/components/dashboard/ChatLevelsForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { resetGuildChatLevelsAction, saveGuildChatLevelsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChatLevelsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [levels, top, structure] = await Promise.all([
    adminApi.chatLevels(guild).then(dashboardData),
    adminApi.chatLevelsTop(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Chat levels" description="Members earn XP for chatting and rise through levels, with roles and a leaderboard. Separate from the clan points, and off until you switch it on." />
      <ChatLevelsForm initial={levels} structure={structure} save={saveGuildChatLevelsAction.bind(null, guildId)} />
      <ChatLevelsBoard initial={top} reset={resetGuildChatLevelsAction.bind(null, guildId)} />
    </div>
  );
}
