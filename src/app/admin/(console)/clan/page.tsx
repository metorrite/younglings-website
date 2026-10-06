import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { ClanPointsForm } from "@/components/admin/ClanPointsForm";

export const metadata = { title: "Clan points — Younglings" };

export default async function ClanPointsPage() {
  const admin = await requireAdmin("/admin/clan");
  const points = unwrap(await adminApi.clanPoints(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clan points &amp; ranks</h1>
        <p className="mt-1 text-sm text-muted">What earns points, and how many each rank needs.</p>
      </div>
      <ClanPointsForm initial={points} />
    </div>
  );
}
