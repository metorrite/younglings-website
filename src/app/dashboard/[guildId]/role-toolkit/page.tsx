import { RoleToolkitManager } from "@/components/dashboard/RoleToolkitManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { planRoleBulkAction, roleBulkAction, roleBulkStatusAction, saveRoleAllowAction } from "./actions";

export const metadata = { title: "Role toolkit — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function RoleToolkitPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [toolkit, structure] = await Promise.all([adminApi.roleToolkit(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role toolkit"
        description="Let junior staff give and take only the roles you choose with /role, and change a role for many members at once with a preview first. Only Admins can use this page."
      />
      <RoleToolkitManager
        initial={toolkit}
        roles={structure.roles}
        actions={{
          saveAllow: saveRoleAllowAction.bind(null, guildId),
          plan: planRoleBulkAction.bind(null, guildId),
          act: roleBulkAction.bind(null, guildId),
          status: roleBulkStatusAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
