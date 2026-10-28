import Link from "next/link";
import { PanelEditor, type PanelEditorWhere } from "@/components/admin/PanelEditor";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
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
    panelBase: `${base}/panels`,
    pvmHelpPath: null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New panel"
        description={
          <>
            Starts with your{" "}
            <Link href={`${base}/defaults`} className="text-gold hover:underline">
              panel defaults
            </Link>
            ; change anything below for just this panel.
          </>
        }
        back={{ href: base, label: "Ticket panels" }}
      />
      <PanelEditor initial={blankPanel(defaults)} structure={structure} where={where} />
    </div>
  );
}
