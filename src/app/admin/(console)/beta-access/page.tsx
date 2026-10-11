import { BetaAccessForm } from "@/components/admin/BetaAccessForm";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "JonnyBot beta access — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function BetaAccessPage() {
  const admin = await requireAdmin("/admin/beta-access");
  const guilds = unwrap(await adminApi.betaGuilds(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">JonnyBot beta access</h1>
        <p className="mt-1 text-sm text-muted">
          While JonnyBot&apos;s website is closed, only the clan&apos;s admins can open it. Add the servers whose admin teams you trust and they can use it too.
        </p>
      </div>
      <BetaAccessForm initial={guilds} />
    </div>
  );
}
