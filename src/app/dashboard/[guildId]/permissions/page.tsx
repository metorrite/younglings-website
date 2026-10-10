import { PermissionGroupsEditor } from "@/components/dashboard/PermissionGroupsEditor";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { savePermissionGroupsAction } from "./actions";

export default async function PermissionsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [permissions, structure] = await Promise.all([adminApi.permissions(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Who can do what. Your server&apos;s roles decide it: put one or several roles in each level, and add groups of your own for jobs that don&apos;t fit
        Admin, Support or Developer.
      </p>
      <PermissionGroupsEditor initial={permissions} roles={structure.roles} canEdit={guild.tier === "ADMIN"} save={savePermissionGroupsAction.bind(null, guildId)} />
    </div>
  );
}
