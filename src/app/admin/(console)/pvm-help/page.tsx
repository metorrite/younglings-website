import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { PvmHelpForm } from "@/components/admin/PvmHelpForm";

export const metadata = { title: "PvM Help — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function PvmHelpPage() {
  const admin = await requireAdmin("/admin/pvm-help");
  const [settings, structure] = await Promise.all([adminApi.helpSettings(admin).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">PvM Help</h1>
        <p className="mt-1 text-sm text-muted">
          The helper roles and guidelines, and when help tickets ping helpers for members and guests. The same settings as PvM Help in /configure. Which ticket panels these rules
          apply to is set on each panel under Ticket panels.
        </p>
      </div>
      <PvmHelpForm initial={settings} structure={structure} />
    </div>
  );
}
