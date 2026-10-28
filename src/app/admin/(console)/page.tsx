import Link from "next/link";
import { requireAdminWithOwner } from "@/lib/admin";
import { adminGroupsFor } from "@/lib/adminNav";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { admin, isOwner } = await requireAdminWithOwner("/admin");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {admin.displayName}</h1>
        <p className="mt-1 text-sm text-muted">
          These are the settings of the Younglings website. Everything that changes how JonnyBot behaves in Discord is on the{" "}
          <Link href="/dashboard" className="text-gold hover:underline">
            bot dashboard
          </Link>
          . Everything here is checked against your roles in the Discord server each time.
        </p>
      </div>

      {adminGroupsFor(isOwner).filter((g) => g.id !== "overview").map((group) => (
        <section key={group.id} aria-labelledby={`group-${group.id}`}>
          <h2 id={`group-${group.id}`} className="mb-1 flex items-center gap-2 text-lg font-semibold text-gold">
            <span aria-hidden>{group.icon}</span>
            {group.label}
          </h2>
          <p className="mb-3 text-sm text-muted">{group.blurb}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.pages.map((page) => (
              <Link key={page.href} href={page.href} className="rounded-lg border border-surface-border bg-surface p-4 transition hover:border-gold/50">
                <h3 className="font-semibold">{page.label}</h3>
                <p className="mt-1 text-sm text-muted">{page.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
