import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { NewsChannelsEditor } from "@/components/admin/NewsChannelsEditor";

export const metadata = { title: "Website news feed — Younglings" };

export default async function NewsAdminPage() {
  const admin = await requireAdmin("/admin/news");
  const [{ channels: configured }, structure] = await Promise.all([adminApi.newsChannels(admin).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Website news feed</h1>
        <p className="mt-1 text-sm text-muted">Which Discord channels feed the announcements block on the home page.</p>
      </div>
      <NewsChannelsEditor initial={configured} channels={structure.channels} />
    </div>
  );
}
