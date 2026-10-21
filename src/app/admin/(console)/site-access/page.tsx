import { SiteAccessForm, type SwitchRow } from "@/components/admin/SiteAccessForm";
import { requireOwner, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { SWITCH_ENV, switchState } from "@/lib/siteSwitches";

export const metadata = { title: "Site access — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function SiteAccessPage() {
  const admin = await requireOwner("/admin/site-access");
  const { switches } = unwrap(await adminApi.siteSwitches(admin));
  const rows: SwitchRow[] = await Promise.all(
    switches.map(async (s) => ({ ...s, envName: SWITCH_ENV[s.key], source: (await switchState(s.key)).source })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Site access</h1>
        <p className="mt-1 text-sm text-muted">Open the JonnyBot website, the clans hub and the bot dashboard to everyone, or close them again, without redeploying.</p>
      </div>
      <SiteAccessForm initial={rows} />
    </div>
  );
}
