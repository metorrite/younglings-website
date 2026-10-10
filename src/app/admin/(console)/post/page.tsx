import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { PostTool } from "@/components/admin/AdminExtras";

export const metadata = { title: "Post a message — Younglings" };

export default async function PostPage() {
  const admin = await requireAdmin("/admin/post");
  const structure = unwrap(await adminApi.structure(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Post a message</h1>
        <p className="mt-1 text-sm text-muted">A formatted announcement, posted by JonnyBot.</p>
      </div>
      <PostTool {...choicesOf(structure)} />
    </div>
  );
}
