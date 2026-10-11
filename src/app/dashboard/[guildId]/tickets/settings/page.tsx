import { SettingsForm } from "@/components/admin/SettingsForm";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildTicketSettingsAction } from "../actions";

export default async function TicketSettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [settings, structure] = await Promise.all([adminApi.getSettings(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Settings that apply to every panel in the server.</p>
      <SettingsForm initial={settings} structure={structure} save={saveGuildTicketSettingsAction.bind(null, guildId)} />
    </div>
  );
}
