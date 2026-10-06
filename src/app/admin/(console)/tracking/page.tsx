import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { TrackingEditor } from "@/components/admin/AdminExtras";

export const metadata = { title: "Tracking channels — Younglings" };

export default async function TrackingPage() {
  const admin = await requireAdmin("/admin/tracking");
  const [{ groups }, structure] = await Promise.all([adminApi.tracking(admin).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tracking channels</h1>
        <p className="mt-1 text-sm text-muted">Where JonnyBot posts each kind of clan event. Each group can post to up to 5 channels.</p>
      </div>
      <TrackingEditor groups={groups} channels={structure.channels} />
    </div>
  );
}
