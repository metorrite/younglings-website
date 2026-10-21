import { PromotionsList } from "@/components/admin/AdminExtras";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { markGuildPromotedAction } from "../bot-pages-actions";

export const metadata = { title: "Promotions — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function PromotionsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const { members } = await adminApi.promotions(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Promotions" description="Members whose clan points have reached their next rank. Promote them in game, then mark them done." />
      <PromotionsList initial={members} markDone={markGuildPromotedAction.bind(null, guildId)} />
    </div>
  );
}
