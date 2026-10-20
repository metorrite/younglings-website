import { RoleFixPanel } from "@/components/dashboard/RoleFixPanel";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { applyRoleFixAction, planRoleFixAction, roleFixStatusAction } from "./actions";

export const metadata = { title: "Fix clan roles — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function RoleSyncPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const status = await adminApi.roleFixStatus(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fix clan roles"
        description="The Member and Guest roles follow the clan roster by themselves from now on. This page fixes the people from before that started: linked members already in the clan who are still Guest, and linked people who left the clan but still hold Member. Only Admins can use it."
      />
      <RoleFixPanel
        initial={status}
        actions={{
          plan: planRoleFixAction.bind(null, guildId),
          apply: applyRoleFixAction.bind(null, guildId),
          status: roleFixStatusAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
