import { AnniversariesForm } from "@/components/dashboard/AnniversariesForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveAnniversariesAction, sendAnniversariesAction } from "./actions";

export const metadata = { title: "Clan anniversaries — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function AnniversariesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [anniversaries, structure] = await Promise.all([adminApi.anniversaries(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clan anniversaries"
        description="Once a week JonnyBot posts the members who reach another year in the clan in the coming seven days, from their in-game clan join dates. Off until you switch it on."
      />
      <AnniversariesForm
        initial={anniversaries}
        structure={structure}
        save={saveAnniversariesAction.bind(null, guildId)}
        send={sendAnniversariesAction.bind(null, guildId)}
      />
    </div>
  );
}
