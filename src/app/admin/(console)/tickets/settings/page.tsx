import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Ticket settings — Younglings" };

export default async function TicketSettingsPage() {
  const admin = await requireAdmin("/admin/tickets/settings");
  const [settings, structure] = await Promise.all([adminApi.getSettings(admin).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ticket settings</h1>
        <p className="mt-1 text-sm text-muted">Apply to every panel in the server.</p>
      </div>
      <SettingsForm initial={settings} structure={structure} />
    </div>
  );
}
