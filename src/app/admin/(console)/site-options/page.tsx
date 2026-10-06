import { SiteOptionsForm } from "@/components/admin/SiteSettingsForms";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "Site options — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function SiteOptionsPage() {
  const admin = await requireAdmin("/admin/site-options");
  const { navEventBubble } = unwrap(await adminApi.siteOptions(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Site options</h1>
        <p className="mt-1 text-sm text-muted">How the public website behaves for visitors.</p>
      </div>
      <SiteOptionsForm navEventBubble={navEventBubble} />
    </div>
  );
}
