import Link from "next/link";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { PanelEditor } from "@/components/admin/PanelEditor";

export const metadata = { title: "Edit ticket panel — Younglings" };

export default async function EditPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin(`/admin/tickets/panels/${encodeURIComponent(id)}`);

  const [panel, structure] = await Promise.all([adminApi.getPanel(admin, id).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tickets" className="text-sm text-muted hover:text-foreground">
          ← Ticket panels
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{panel.name}</h1>
      </div>
      {/* Keyed by the panel and its posted message so the editor starts fresh after a successful post. */}
      <PanelEditor key={`${panel.id}-${panel.postedMessageId ?? ""}`} initial={panel} structure={structure} />
    </div>
  );
}
