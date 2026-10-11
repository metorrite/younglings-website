import Link from "next/link";
import { RolePanelEditor, type RolePanelActions } from "@/components/dashboard/RolePanelEditor";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteGuildRolePanelAction, postGuildRolePanelAction, saveGuildRolePanelAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditRolePanelPage({ params }: { params: Promise<{ guildId: string; id: string }> }) {
  const { guildId, id } = await params;
  const guild = await requireGuild(guildId);
  const [panel, structure, list] = await Promise.all([adminApi.rolePanel(guild, id).then(dashboardData), adminApi.structure(guild).then(dashboardData), adminApi.rolePanels(guild).then(dashboardData)]);
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
      <div>
        <Link href={base} className="text-sm text-muted hover:text-foreground">
          ← Role panels
        </Link>
      </div>
      <PageHeader title={panel.name} description="Change the message or its buttons, then save. Update the posted message to show the changes in Discord." />
      {/* Keyed by the panel and its posted message so the editor starts fresh after a post. */}
      <RolePanelEditor key={`${panel.id}-${panel.messageId ?? ""}`} initial={panel} structure={structure} actions={actions} maxButtons={list.maxButtons} />
    </div>
  );
}
