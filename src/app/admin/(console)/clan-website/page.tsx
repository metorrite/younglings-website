import { ClanWebsiteForm } from "@/components/admin/SiteSettingsForms";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "Clan website — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function ClanWebsitePage() {
  const admin = await requireAdmin("/admin/clan-website");
  const { websiteUrl } = unwrap(await adminApi.clanWebsite(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clan website</h1>
        <p className="mt-1 text-sm text-muted">Where the clan name in Discord should link to.</p>
      </div>
      <ClanWebsiteForm initial={websiteUrl} />
    </div>
  );
}
