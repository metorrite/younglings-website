import { ScheduledPosts } from "@/components/admin/ScheduledPosts";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "Scheduled posts — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function ScheduledPage() {
  const admin = await requireAdmin("/admin/scheduled");
  const [structure, scheduled] = await Promise.all([adminApi.structure(admin), adminApi.scheduled(admin)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scheduled posts</h1>
        <p className="mt-1 text-sm text-muted">Write an announcement now and have JonnyBot post it later.</p>
      </div>
      <ScheduledPosts initial={unwrap(scheduled).posts} channels={unwrap(structure).channels} />
    </div>
  );
}
