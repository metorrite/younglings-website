import { GiveawaysManager } from "@/components/dashboard/GiveawaysManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import {
  deleteGuildGiveawayAction,
  endGuildGiveawayAction,
  rerollGuildGiveawayAction,
  startGuildGiveawayAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function GiveawaysPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [giveaways, structure] = await Promise.all([
    adminApi.giveaways(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giveaways"
        description="Run a giveaway with an Enter button and a timed draw. See who entered, end one early, or draw again."
      />
      <GiveawaysManager
        initial={giveaways}
        structure={structure}
        roles={structure.roles}
        actions={{
          start: startGuildGiveawayAction.bind(null, guildId),
          end: endGuildGiveawayAction.bind(null, guildId),
          reroll: rerollGuildGiveawayAction.bind(null, guildId),
          remove: deleteGuildGiveawayAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
