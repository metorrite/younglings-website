import Link from "next/link";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { PanelEditor } from "@/components/admin/PanelEditor";
import { blankPanel } from "@/lib/panel-defaults";

export const metadata = { title: "New ticket panel — Younglings" };

export default async function NewPanelPage() {
  const admin = await requireAdmin("/admin/tickets/panels/new");
  const [structure, defaults] = await Promise.all([adminApi.structure(admin).then(unwrap), adminApi.getPanelDefaults(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tickets" className="text-sm text-muted hover:text-foreground">
          ← Ticket panels
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New panel</h1>
        <p className="mt-1 text-sm text-muted">
          Starts with your{" "}
          <Link href="/admin/tickets/defaults" className="text-gold hover:underline">
            panel defaults
          </Link>
          ; change anything below for just this panel.
        </p>
      </div>
      <PanelEditor initial={blankPanel(defaults)} structure={structure} />
    </div>
  );
}
