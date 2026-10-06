import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { PromotionsList } from "@/components/admin/AdminExtras";

export const metadata = { title: "Promotions — Younglings" };

export default async function PromotionsPage() {
  const admin = await requireAdmin("/admin/promotions");
  const { members } = unwrap(await adminApi.promotions(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Promotions</h1>
        <p className="mt-1 text-sm text-muted">Who has earned their next rank.</p>
      </div>
      <PromotionsList initial={members} />
    </div>
  );
}
