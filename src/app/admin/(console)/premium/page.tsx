import { PremiumConsole } from "@/components/admin/PremiumConsole";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { premiumHistoryAction, removePremiumGrantAction, savePremiumGrantAction } from "./actions";

export const metadata = { title: "Premium — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function PremiumPage() {
  const admin = await requireAdmin("/admin/premium");
  const plan = unwrap(await adminApi.premiumGuilds(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Premium</h1>
        <p className="mt-1 text-sm text-muted">
          Which servers have a plan above the free one, until when, and every change made. Plans are granted by hand: there are no prices or payments. A plan that reaches its end date stops by
          itself, and nothing is sent to the server about it.
        </p>
      </div>
      <PremiumConsole initial={plan} save={savePremiumGrantAction} remove={removePremiumGrantAction} history={premiumHistoryAction} />
    </div>
  );
}
