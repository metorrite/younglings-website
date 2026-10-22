import { StaffDigestForm } from "@/components/dashboard/StaffDigestForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveStaffDigestAction, sendStaffDigestAction } from "./actions";

export const metadata = { title: "Staff digest — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function StaffDigestPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [digest, structure] = await Promise.all([adminApi.staffDigest(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff digest"
        description="Once a week JonnyBot posts one summary for staff in a channel you choose: who needs attention, open tickets, and the events coming up. Off until you switch it on."
      />
      <StaffDigestForm
        initial={digest}
        structure={structure}
        links={{ attention: `/dashboard/${guildId}/attention`, tickets: `/dashboard/${guildId}/tickets`, events: `/dashboard/${guildId}/events` }}
        save={saveStaffDigestAction.bind(null, guildId)}
        send={sendStaffDigestAction.bind(null, guildId)}
      />
    </div>
  );
}
