import { ClanPointsForm } from "@/components/admin/ClanPointsForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildClanPointsAction } from "../bot-pages-actions";

export const metadata = { title: "Clan points & ranks — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function ClanPointsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const points = await adminApi.clanPoints(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Clan points & ranks" description="What earns clan points (membership, Citadel), and how many points each clan rank needs." />
      <ClanPointsForm initial={points} save={saveGuildClanPointsAction.bind(null, guildId)} />
    </div>
  );
}
