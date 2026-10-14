import { CitadelWheel } from "@/components/dashboard/CitadelWheel";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import type { CitadelCappers, WheelSettings } from "@/lib/citadelTypes";
import { adminApi } from "@/lib/jonnybot-admin";
import { citadelCappersAction, postCitadelWinnerAction, saveCitadelWheelAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CitadelWheelPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [initial, settings, structure] = await Promise.all([
    adminApi.citadelCappers(guild, null).then(dashboardData) as Promise<CitadelCappers>,
    adminApi.citadelWheel(guild).then(dashboardData) as Promise<WheelSettings>,
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citadel wheel"
        description="A wheel of everyone who capped at the Clan Citadel in a week. Add names, give someone an extra entry for a prize or a missed cap, spin for the winner and announce them in Discord."
      />
      <CitadelWheel
        initial={initial}
        settings={settings}
        structure={structure}
        load={citadelCappersAction.bind(null, guildId)}
        actions={{
          saveSettings: saveCitadelWheelAction.bind(null, guildId),
          post: postCitadelWinnerAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
