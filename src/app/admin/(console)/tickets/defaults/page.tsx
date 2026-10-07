import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { PanelDefaultsForm } from "@/components/admin/PanelDefaultsForm";

export const metadata = { title: "Panel defaults — Younglings" };
export const dynamic = "force-dynamic";

export default async function PanelDefaultsPage() {
  const admin = await requireAdmin("/admin/tickets/defaults");
  const [defaults, structure] = await Promise.all([adminApi.getPanelDefaults(admin).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel defaults</h1>
        <p className="mt-1 text-sm text-muted">
          What every new ticket panel starts with, such as the staff roles and who may close a ticket. You can still add, change or remove any of it on each panel, and
          changing these never touches panels that already exist.
        </p>
      </div>
      <PanelDefaultsForm initial={defaults} structure={structure} />
    </div>
  );
}
