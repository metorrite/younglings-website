import { PremiumPlanForm } from "@/components/admin/PremiumPlanForm";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "Polling plan — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function PollingPlanPage() {
  const admin = await requireAdmin("/admin/polling-plan");
  const plan = unwrap(await adminApi.premiumGuilds(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Polling plan</h1>
        <p className="mt-1 text-sm text-muted">
          How often each server&apos;s clan players are refreshed from RuneMetrics. Every server is on the standard plan unless it is listed here. This server is currently on the{" "}
          <strong>{plan.thisServer ? "premium" : "standard"}</strong> plan.
        </p>
      </div>
      <PremiumPlanForm initial={plan} />
    </div>
  );
}
