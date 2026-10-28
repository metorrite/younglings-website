import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { WelcomeEditor } from "@/components/admin/WelcomeEditor";
import { WelcomeCardPanel } from "@/components/dashboard/WelcomeCardPanel";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, choicesOf, dashboardApi } from "@/lib/jonnybot-admin";
import { removeGuildWelcomeImageAction, saveGuildWelcomeAction, saveGuildWelcomeCardAction, testGuildWelcomeAction } from "./actions";

export default async function GuildWelcomePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [welcome, structure, card] = await Promise.all([dashboardApi.welcome(guild).then(dashboardData), dashboardApi.structure(guild).then(dashboardData), adminApi.welcomeCard(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Welcome message" description="Greets each new member in a channel, as text, an embed, or both. It can also send them a copy by DM when their DMs are open. Bots are never welcomed." />
      <WelcomeEditor
        initial={welcome}
        {...choicesOf(structure)}
        actions={{
          save: saveGuildWelcomeAction.bind(null, guildId),
          test: testGuildWelcomeAction.bind(null, guildId),
          imageUploadUrl: `/api/guild-images/${guildId}/welcome`,
          removeImage: removeGuildWelcomeImageAction.bind(null, guildId),
        }}
      />
      <WelcomeCardPanel
        initial={card}
        save={saveGuildWelcomeCardAction.bind(null, guildId)}
        uploads={{ url: `/api/guild-images/${guildId}/welcome`, remove: removeGuildWelcomeImageAction.bind(null, guildId) }}
      />
    </div>
  );
}
