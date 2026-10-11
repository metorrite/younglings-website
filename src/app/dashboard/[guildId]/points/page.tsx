import { PointsManager } from "@/components/dashboard/PointsManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import {
  awardPointsAction,
  decideSubmissionAction,
  handleRedemptionAction,
  saveRewardAction,
  savePointsSettingsAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function PointsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [overview, submissions, structure, rewards, redemptions] = await Promise.all([
    adminApi.points(guild).then(dashboardData),
    adminApi.pointsSubmissions(guild).then(dashboardData),
    adminApi.structure(guild).then(dashboardData),
    adminApi.pointsRewards(guild).then(dashboardData),
    adminApi.pointsRedemptions(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points"
        description="A points ledger for your server. Every change is kept in the history with a reason, so a mistake is fixed with an opposite entry and nothing is ever quietly edited."
      />
      <PointsManager
        initial={overview}
        submissions={submissions}
        structure={structure}
        rewards={rewards}
        redemptions={redemptions}
        actions={{
          saveSettings: savePointsSettingsAction.bind(null, guildId),
          award: awardPointsAction.bind(null, guildId),
          decide: decideSubmissionAction.bind(null, guildId),
          saveReward: saveRewardAction.bind(null, guildId),
          handleRedemption: handleRedemptionAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
