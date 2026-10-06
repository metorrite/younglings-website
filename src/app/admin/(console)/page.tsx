import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ADMIN_GROUPS } from "@/lib/adminNav";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

const chip = (n: number, good = "text-emerald-400", bad = "text-gold") => (n === 0 ? good : bad);

export default async function AdminHomePage() {
  const admin = await requireAdmin("/admin");
  const [attention, health] = await Promise.all([adminApi.attention(admin), adminApi.health(admin)]);
  const a = attention.ok ? attention.data : null;
  const h = health.ok ? health.data : null;

  const cards = a
    ? [
        { label: "Unverified members", n: a.unverified.length, href: "/admin/attention#unverified" },
        { label: "Stale data", n: a.stale.length, href: "/admin/attention#stale" },
        { label: "Inactive 30+ days", n: a.inactive.length, href: "/admin/attention#inactive" },
        { label: "Promotions due", n: a.promotions.length, href: "/admin/promotions" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {admin.displayName}</h1>
        <p className="mt-1 text-sm text-muted">Everything here is checked against your roles in the Discord server each time.</p>
      </div>

      <section aria-label="Right now" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-lg border border-surface-border bg-surface p-4 transition hover:border-gold/50">
            <p className="text-xs tracking-wider text-muted uppercase">{c.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${chip(c.n)}`}>{c.n}</p>
          </Link>
        ))}
        <Link href="/admin/health" className="rounded-lg border border-surface-border bg-surface p-4 transition hover:border-gold/50">
          <p className="text-xs tracking-wider text-muted uppercase">Bot</p>
          {h ? (
            <p className={`mt-1 text-2xl font-semibold ${h.discord.status === "CONNECTED" && h.database.ok ? "text-emerald-400" : "text-red-400"}`}>{h.discord.status === "CONNECTED" && h.database.ok ? "Healthy" : "Check health"}</p>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-red-400">Unreachable</p>
          )}
        </Link>
      </section>

      {ADMIN_GROUPS.filter((g) => g.id !== "overview").map((group) => (
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
