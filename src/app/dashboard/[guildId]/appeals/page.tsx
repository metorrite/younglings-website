import { AppealsManager } from "@/components/dashboard/AppealsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { decideAppealAction, saveAppealSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

/** Ban and mute appeals (T-033): the settings and every appeal, with Approve and Reject (the same as the buttons in each appeal's staff ticket). */
export default async function AppealsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [view, structure] = await Promise.all([adminApi.appeals(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appeals"
        description="People you banned or timed out can appeal on the JonnyBot website, signed in with Discord. Each appeal opens a staff-only ticket with their case history, and you approve (lifting it) or turn it down here or in the ticket."
      />
      <AppealsManager
        guildId={guildId}
        initial={view}
        channels={structure.channels}
        actions={{ save: saveAppealSettingsAction.bind(null, guildId), decide: decideAppealAction.bind(null, guildId) }}
      />
    </div>
  );
}
