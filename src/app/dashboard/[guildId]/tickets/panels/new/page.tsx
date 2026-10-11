import Link from "next/link";
import { PanelEditor, type PanelEditorWhere } from "@/components/admin/PanelEditor";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { blankPanel } from "@/lib/panel-defaults";
import { deleteGuildPanelAction, postGuildPanelAction, saveGuildPanelAction } from "../../actions";

export default async function NewPanelPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [structure, defaults] = await Promise.all([adminApi.structure(guild).then(dashboardData), adminApi.getPanelDefaults(guild).then(dashboardData)]);
  const base = `/dashboard/${guildId}/tickets`;
  const where: PanelEditorWhere = {
    save: saveGuildPanelAction.bind(null, guildId),
    remove: deleteGuildPanelAction.bind(null, guildId),
    post: postGuildPanelAction.bind(null, guildId),
    listPath: base,
    panelPath: (id) => `${base}/panels/${id}`,
    pvmHelpPath: null,
  };

  return (
    <div className="space-y-4">
      <div>
        <Link href={base} className="text-sm text-muted hover:text-foreground">
          ← Ticket panels
        </Link>
        <h2 className="mt-2 text-xl font-semibold">New panel</h2>
        <p className="mt-1 text-sm text-muted">
          Starts with your{" "}
          <Link href={`${base}/defaults`} className="text-gold hover:underline">
            panel defaults
          </Link>
          ; change anything below for just this panel.
        </p>
      </div>
      <PanelEditor initial={blankPanel(defaults)} structure={structure} where={where} />
    </div>
  );
}
