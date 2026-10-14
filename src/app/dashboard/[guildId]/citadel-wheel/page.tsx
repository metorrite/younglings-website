import { CitadelWheel } from "@/components/dashboard/CitadelWheel";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import type { CitadelCappers } from "@/lib/citadelTypes";
import { adminApi } from "@/lib/jonnybot-admin";
import { citadelCappersAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CitadelWheelPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const initial = (await adminApi.citadelCappers(guild, null).then(dashboardData)) as CitadelCappers;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citadel wheel"
        description="A wheel of everyone who capped at the Clan Citadel in a week. Add names, give someone an extra entry for a prize or a missed cap, and spin for the winner."
      />
      <CitadelWheel initial={initial} load={citadelCappersAction.bind(null, guildId)} />
    </div>
  );
}
