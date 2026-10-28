import { RoleKeeperManager } from "@/components/dashboard/RoleKeeperManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { addKeptAction, addTempAction, endTempAction, removeKeptAction, saveStickyAction } from "./actions";

export const metadata = { title: "Kept roles — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function RoleKeeperPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [keeper, structure] = await Promise.all([adminApi.roleKeeper(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kept roles"
        description="Roles that outlast a visit: a sticky list that comes back when someone rejoins (so leaving cannot shake off a Muted role), roles kept on single members, and roles that end by themselves after a time. Only Admins can use this page."
      />
      <RoleKeeperManager
        initial={keeper}
        roles={structure.roles}
        actions={{
          saveSticky: saveStickyAction.bind(null, guildId),
          addKept: addKeptAction.bind(null, guildId),
          removeKept: removeKeptAction.bind(null, guildId),
          addTemp: addTempAction.bind(null, guildId),
          endTemp: endTempAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
