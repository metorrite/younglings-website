import { RoleRulesManager } from "@/components/dashboard/RoleRulesManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteRoleRuleAction, saveRoleRuleAction } from "./actions";

export const metadata = { title: "Role rules — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function RoleRulesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [list, structure] = await Promise.all([adminApi.roleRules(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role rules"
        description="Roles that follow other roles: when someone gains (or loses) a role, give or take away others. Only Admins can use this page. Rules react to role changes from now on; saving one changes nobody's roles by itself."
      />
      <RoleRulesManager initial={list} roles={structure.roles} actions={{ save: saveRoleRuleAction.bind(null, guildId), remove: deleteRoleRuleAction.bind(null, guildId) }} />
    </div>
  );
}
