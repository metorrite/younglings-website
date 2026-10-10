import { WelcomeEditor } from "@/components/admin/WelcomeEditor";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { dashboardApi } from "@/lib/jonnybot-admin";
import { saveGuildWelcomeAction, testGuildWelcomeAction } from "./actions";

export default async function GuildWelcomePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [welcome, structure] = await Promise.all([dashboardApi.welcome(guild).then(dashboardData), dashboardApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Greets each new member in a channel, as text, an embed, or both. It can also send them a copy by DM when their DMs are open. Bots are never welcomed.
      </p>
      <WelcomeEditor
        initial={welcome}
        channels={structure.channels}
        actions={{ save: saveGuildWelcomeAction.bind(null, guildId), test: testGuildWelcomeAction.bind(null, guildId) }}
      />
    </div>
  );
}
