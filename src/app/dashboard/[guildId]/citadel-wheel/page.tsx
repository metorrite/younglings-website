import { CitadelWheel } from "@/components/dashboard/CitadelWheel";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import type { CitadelCappers, WheelSettings, WheelWeek } from "@/lib/citadelTypes";
import { adminApi } from "@/lib/jonnybot-admin";
import {
  citadelCappersAction,
  citadelHoldersAction,
  citadelWinnerAction,
  lockCitadelWinnerAction,
  markCitadelPrizeAction,
  postCitadelWinnerAction,
  postLockedCitadelWinnerAction,
  recordCitadelPrizeAction,
  recordPastWeekAction,
  saveCitadelWheelAction,
  unlockCitadelWinnerAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CitadelWheelPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [initial, winners, settings, structure] = await Promise.all([
    adminApi.citadelCappers(guild, null).then(dashboardData) as Promise<CitadelCappers>,
    adminApi.citadelWinners(guild).then(dashboardData) as Promise<{ weeks: WheelWeek[] }>,
    adminApi.citadelWheel(guild).then(dashboardData) as Promise<WheelSettings>,
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citadel wheel"
        description="A wheel of everyone who capped at the Clan Citadel in a week. Add names, give someone an extra entry for a prize or a missed cap, spin for the winner, lock in one or more winners, copy the announcement with the wheel GIF, and keep track of their prizes."
      />
      <CitadelWheel
        initial={initial}
        weeks={winners.weeks}
        settings={settings}
        structure={structure}
        load={citadelCappersAction.bind(null, guildId)}
        actions={{
          saveSettings: saveCitadelWheelAction.bind(null, guildId),
          post: postCitadelWinnerAction.bind(null, guildId),
          lock: lockCitadelWinnerAction.bind(null, guildId),
          recordPast: recordPastWeekAction.bind(null, guildId),
          unlock: unlockCitadelWinnerAction.bind(null, guildId),
          week: citadelWinnerAction.bind(null, guildId),
          postLocked: postLockedCitadelWinnerAction.bind(null, guildId),
          markPrize: markCitadelPrizeAction.bind(null, guildId),
          recordPrize: recordCitadelPrizeAction.bind(null, guildId),
          holders: citadelHoldersAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
