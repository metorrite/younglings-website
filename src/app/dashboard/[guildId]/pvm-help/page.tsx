import { PvmHelpForm } from "@/components/admin/PvmHelpForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { createGuildHelpPanelsAction, postGuildHelpGuidelinesAction, saveGuildHelpSettingsAction } from "../bot-pages-actions";

export const metadata = { title: "PvM Help — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function PvmHelpPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [settings, structure] = await Promise.all([adminApi.helpSettings(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="PvM Help"
        description="The helper roles and guidelines, and when help tickets ping helpers for members and guests. The same settings as PvM Help in /configure. Which panels these rules apply to is set on each ticket panel."
      />
      <PvmHelpForm
        initial={settings}
        structure={structure}
        bindings={{
          save: saveGuildHelpSettingsAction.bind(null, guildId),
          createPanels: createGuildHelpPanelsAction.bind(null, guildId),
          postGuidelines: postGuildHelpGuidelinesAction.bind(null, guildId),
          panelBaseHref: `/dashboard/${guildId}/tickets/panels`,
        }}
      />
    </div>
  );
}
