import { PanelDefaultsForm } from "@/components/admin/PanelDefaultsForm";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildPanelDefaultsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelDefaultsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [defaults, structure] = await Promise.all([adminApi.getPanelDefaults(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        What every new ticket panel starts with, such as the staff roles and who may close a ticket. You can still add, change or remove any of it on each panel, and changing these never touches panels that
        already exist.
      </p>
      <PanelDefaultsForm initial={defaults} structure={structure} save={saveGuildPanelDefaultsAction.bind(null, guildId)} />
    </div>
  );
}
