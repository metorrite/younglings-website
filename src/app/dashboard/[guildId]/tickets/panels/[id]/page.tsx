import Link from "next/link";
import { PanelEditor, type PanelEditorWhere } from "@/components/admin/PanelEditor";
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
    panelPath: (panelId) => `${base}/panels/${panelId}`,
    pvmHelpPath: null,
  };

  return (
    <div className="space-y-4">
      <div>
        <Link href={base} className="text-sm text-muted hover:text-foreground">
          ← Ticket panels
        </Link>
        <h2 className="mt-2 text-xl font-semibold">{panel.name}</h2>
      </div>
      {/* Keyed by the panel and its posted message so the editor starts fresh after a successful post. */}
      <PanelEditor key={`${panel.id}-${panel.postedMessageId ?? ""}`} initial={panel} structure={structure} where={where} />
    </div>
  );
}
