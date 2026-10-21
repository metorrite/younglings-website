import { EmbedderPanels } from "@/components/dashboard/EmbedderPanels";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { cloneEmbedderMessageAction, deleteEmbedderMessageAction, postEmbedderMessageAction, saveEmbedderMessageAction } from "./actions";

export const metadata = { title: "Message embedder — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function EmbedderPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, structure] = await Promise.all([adminApi.embedderMessages(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message embedder"
        description="Write a message once, keep it as a draft, post it in a channel, and change or delete it later without posting a new one. You can also copy a posted message into another channel."
      />
      <EmbedderPanels
        initial={list.messages}
        limit={list.limit}
        {...choicesOf(structure)}
        actions={{
          save: saveEmbedderMessageAction.bind(null, guildId),
          post: postEmbedderMessageAction.bind(null, guildId),
          clone: cloneEmbedderMessageAction.bind(null, guildId),
          remove: deleteEmbedderMessageAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
