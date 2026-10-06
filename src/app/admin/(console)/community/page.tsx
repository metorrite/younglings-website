import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { CommunitySettingsForm } from "@/components/admin/AdminExtras";

export const metadata = { title: "Community settings — Younglings" };

export default async function CommunityPage() {
  const admin = await requireAdmin("/admin/community");
  const [settings, structure] = await Promise.all([adminApi.community(admin).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Community settings</h1>
        <p className="mt-1 text-sm text-muted">Settings for what members can do from the website.</p>
      </div>
      <CommunitySettingsForm pollChannelId={settings.pollChannelId} channels={structure.channels} />
    </div>
  );
}
