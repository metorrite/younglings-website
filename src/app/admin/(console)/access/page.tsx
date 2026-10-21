import { AccessGrantsForm } from "@/components/admin/AccessGrantsForm";
import { requireOwner, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "Restricted access — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const admin = await requireOwner("/admin/access");
  const list = unwrap(await adminApi.accessGrants(admin));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Restricted access</h1>
        <p className="mt-1 text-sm text-muted">
          Parts of the site that are closed to the public (today the JonnyBot website, the clans hub and the bot dashboard). Let in one person, or everyone at a permission level in
          one server, without making that server a beta server.
        </p>
      </div>
      <AccessGrantsForm initial={list} />
    </div>
  );
}
