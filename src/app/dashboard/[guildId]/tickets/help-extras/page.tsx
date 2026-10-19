import { HelpExtrasForm } from "@/components/dashboard/HelpExtrasForm";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildHelpExtrasAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function HelpExtrasPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const extras = await adminApi.helpExtras(guild).then(dashboardData);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Optional extras for PvM Help and CA Help tickets. Each one is off until you switch it on.</p>
      <HelpExtrasForm initial={extras} save={saveGuildHelpExtrasAction.bind(null, guildId)} />
    </div>
  );
}
