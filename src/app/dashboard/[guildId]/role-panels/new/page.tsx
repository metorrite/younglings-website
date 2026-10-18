import { RolePanelEditor, type RolePanelActions } from "@/components/dashboard/RolePanelEditor";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteGuildRolePanelAction, postGuildRolePanelAction, saveGuildRolePanelAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewRolePanelPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [structure, list] = await Promise.all([adminApi.structure(guild).then(dashboardData), adminApi.rolePanels(guild).then(dashboardData)]);
  const base = `/dashboard/${guildId}/role-panels`;
  const actions: RolePanelActions = {
    save: saveGuildRolePanelAction.bind(null, guildId),
    remove: deleteGuildRolePanelAction.bind(null, guildId),
    post: postGuildRolePanelAction.bind(null, guildId),
    listPath: base,
    panelBase: base,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New role panel" description="Write the message, add a button for each role, then create it. You can post it in a channel right after." back={{ href: base, label: "Role panels" }} />
      <RolePanelEditor
        initial={{ id: null, name: "", title: "", description: "", color: null, mode: "TOGGLE", posted: false, channelId: null, messageId: null, buttons: [{ roleId: "", label: "", emoji: null, style: "primary" }] }}
        structure={structure}
        actions={actions}
        maxButtons={list.maxButtons}
      />
    </div>
  );
}
