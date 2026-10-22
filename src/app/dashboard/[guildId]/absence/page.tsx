import { AbsenceManager } from "@/components/dashboard/AbsenceManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { endAbsenceAction, saveAbsenceAction } from "./actions";

export const metadata = { title: "Leave of absence — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function AbsencePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const absence = await adminApi.absence(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave of absence"
        description="Members say they're away for a while (holiday, busy) with /absence or on their profile, so Needs attention doesn't flag them as inactive or not capped. Off until you switch it on."
      />
      <AbsenceManager initial={absence} attentionHref={`/dashboard/${guildId}/attention`} save={saveAbsenceAction.bind(null, guildId)} end={endAbsenceAction.bind(null, guildId)} />
    </div>
  );
}
