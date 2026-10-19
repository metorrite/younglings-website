import Link from "next/link";
import { requireOwner } from "@/lib/admin";
import { ADMIN_GROUPS } from "@/lib/adminNav";

export const metadata = { title: "Super admin — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  await requireOwner("/admin/super");
  const group = ADMIN_GROUPS.find((g) => g.id === "super");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Super admin</h1>
        <p className="mt-1 text-sm text-muted">Only you, as the owner of JonnyBot, see this. Each page here decides something for every server, so each one checks that it is you before it shows or saves anything.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group?.pages
          .filter((p) => p.href !== "/admin/super")
          .map((page) => (
            <Link key={page.href} href={page.href} className="rounded-lg border border-surface-border bg-surface p-4 transition hover:border-gold/50">
              <h2 className="font-semibold">{page.label}</h2>
              <p className="mt-1 text-sm text-muted">{page.blurb}</p>
            </Link>
          ))}
      </div>
    </div>
  );
}
