import { PanelEditor, type PanelEditorWhere } from "@/components/admin/PanelEditor";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { deleteGuildPanelAction, postGuildPanelAction, saveGuildPanelAction } from "../../actions";

export default async function EditPanelPage({ params }: { params: Promise<{ guildId: string; id: string }> }) {
  const { guildId, id } = await params;
  const guild = await requireGuild(guildId);
  const [panel, structure] = await Promise.all([adminApi.getPanel(guild, id).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);
  const base = `/dashboard/${guildId}/tickets`;
  const where: PanelEditorWhere = {
    save: saveGuildPanelAction.bind(null, guildId),
    remove: deleteGuildPanelAction.bind(null, guildId),
    post: postGuildPanelAction.bind(null, guildId),
    listPath: base,
    panelBase: `${base}/panels`,
    pvmHelpPath: null,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={panel.name} description="Change what members see, who handles the tickets and the form, then save. Post it again to show the changes in Discord." back={{ href: base, label: "Ticket panels" }} />
      {/* Keyed by the panel and its posted message so the editor starts fresh after a successful post. */}
      <PanelEditor key={`${panel.id}-${panel.postedMessageId ?? ""}`} initial={panel} structure={structure} where={where} />
    </div>
  );
}
