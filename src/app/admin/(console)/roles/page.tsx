import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { SelfRolesEditor } from "@/components/admin/SelfRolesEditor";

export const metadata = { title: "Self-assignable roles — Younglings" };

export default async function SelfRolesPage() {
  const admin = await requireAdmin("/admin/roles");
  const [{ roles: configured }, structure] = await Promise.all([adminApi.selfRoles(admin).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Self-assignable roles</h1>
        <p className="mt-1 text-sm text-muted">The roles members can give themselves from their profile page.</p>
      </div>
      <SelfRolesEditor initial={configured} roles={structure.roles} />
    </div>
  );
}
