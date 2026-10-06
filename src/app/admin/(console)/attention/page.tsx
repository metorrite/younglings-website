import Link from "next/link";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi, type AttentionItem } from "@/lib/jonnybot-admin";

export const metadata = { title: "Needs attention — Admin — Younglings" };
export const dynamic = "force-dynamic";

function Section({ id, title, hint, items, tone }: { id: string; title: string; hint: string; items: AttentionItem[]; tone: string }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-xl border border-surface-border bg-surface p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className={`font-semibold ${items.length === 0 ? "text-emerald-400" : tone}`}>{title}</h2>
        <span className="text-sm text-muted">{items.length}</span>
      </div>
      <p className="mb-3 text-sm text-muted">{hint}</p>
      {items.length === 0 ? (
        <p className="text-sm text-emerald-400">All clear.</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.rsn} className="flex items-baseline justify-between gap-3 border-b border-surface-border/40 py-1 text-sm">
              <Link href={`/members/${encodeURIComponent(item.rsn)}`} className="font-medium hover:text-gold">
                {item.rsn}
              </Link>
              <span className="truncate text-xs text-muted">{item.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AttentionPage() {
  const admin = await requireAdmin("/admin/attention");
  const a = unwrap(await adminApi.attention(admin));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Needs attention</h1>
        <p className="mt-1 text-sm text-muted">{a.total} members. Things worth a look, from the roster. Open the <Link href="/admin/members" className="text-gold hover:underline">roster</Link> for the full table.</p>
      </div>
      <Section id="promotions" title="Promotions due" hint="Points have reached the next rank. Promote in game, then mark them done on the Promotions page." items={a.promotions} tone="text-gold" />
      <Section id="unverified" title="Unverified" hint="No Discord account linked to this RuneScape name, so they can't use member features or appear as verified." items={a.unverified} tone="text-gold" />
      <Section id="stale" title="Stale data" hint="Not refreshed from RuneMetrics in over 8 hours. Usually a private profile, a renamed account, or rate limiting." items={a.stale} tone="text-red-400" />
      <Section id="inactive" title="Inactive 30+ days" hint="No adventure-log activity for a month (members who joined in the last week are skipped)." items={a.inactive} tone="text-gold" />
      <Section id="uncapped" title="Not capped this week" hint={`Citadel week of ${a.weekStart}. Anyone who hasn't capped yet.`} items={a.notCapped} tone="text-muted" />
    </div>
  );
}
