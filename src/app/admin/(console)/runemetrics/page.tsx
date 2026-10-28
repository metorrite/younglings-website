import { Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { adminApi, type RuneMetricsTier } from "@/lib/jonnybot-admin";

export const metadata = { title: "RuneMetrics budget — Admin — Younglings" };
export const dynamic = "force-dynamic";

const TIER: Record<RuneMetricsTier["tier"], string> = { INTERACTIVE: "Someone pressed a button", PREMIUM_CLAN: "Premium clans", CLAN: "Clans", LINKED: "Linked players outside a clan" };
const n = (v: number) => v.toLocaleString("en-GB");
const lag = (seconds: number) => (seconds < 120 ? `${seconds}s` : seconds < 7200 ? `${Math.round(seconds / 60)} min` : `${(seconds / 3600).toFixed(1)} h`);

export default async function RuneMetricsBudgetPage() {
  const admin = await requireAdmin("/admin/runemetrics");
  const result = await adminApi.runemetricsBudget(admin);

  if (!result.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">RuneMetrics budget</h1>
        <p className="rounded-xl border border-surface-border bg-surface p-6 text-sm text-muted">
          {result.status === 403 ? "Only JonnyBot's owner can see this page." : `The budget isn't available right now (${result.status === 404 ? "this bot is older than this page" : result.error}).`}
        </p>
      </div>
    );
  }

  const b = result.data;
  const sentToday = b.tiers.reduce((sum, t) => sum + t.sent, 0);
  const used = b.capacityPerDay > 0 ? Math.round((b.clanDemandPerDay / b.capacityPerDay) * 100) : 0;
  const days = [...new Set(b.history.map((h) => h.day))].slice(0, 14);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">RuneMetrics budget</h1>
        <p className="mt-1 text-sm text-muted">
          Every player lookup goes through one shared queue. This page shows how much each tier uses, how far behind each is, and what each server&apos;s clan asks of it. Counters only: no player
          names. A snapshot from when the page loaded; today is {b.day} (UTC).
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sent today" value={n(sentToday)} />
        <Stat label="Pace" value={`1 per ${b.pace.intervalSeconds}s`} detail={b.pace.slowedBy > 1 ? `slowed ${b.pace.slowedBy}x after a rate limit` : `${b.pace.requestsLastMinute} in the last minute`} />
        <Stat label="Clan demand a day" value={n(b.clanDemandPerDay)} detail={`${used}% of the ${n(b.capacityPerDay)} the pace allows`} warn={used > 80} />
        <Stat label="Waiting now" value={n(b.pace.queued)} />
      </section>

      <Card title="Tiers" hint="Sent = requests that went out today. Reused = answered from a recent snapshot instead. Behind = the longest wait is over half of the tier's window.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3">Window</th>
                <th className="py-2 pr-3">Waiting</th>
                <th className="py-2 pr-3">Longest wait</th>
                <th className="py-2 pr-3">Sent</th>
                <th className="py-2 pr-3">Reused</th>
                <th className="py-2 pr-3">Rate limited</th>
                <th className="py-2 pr-3">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {b.tiers.map((t) => (
                <tr key={t.tier}>
                  <td className="py-2 pr-3 font-medium">{TIER[t.tier]}</td>
                  <td className="py-2 pr-3 text-muted">{t.windowMinutes ? `${t.windowMinutes} min` : "at once"}</td>
                  <td className="py-2 pr-3 tabular-nums">{n(t.queued)}</td>
                  <td className={`py-2 pr-3 tabular-nums ${t.behind ? "text-red-300" : ""}`}>
                    {t.lagSeconds > 0 ? lag(t.lagSeconds) : "none"}
                    {t.behind ? " (behind)" : ""}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{n(t.sent)}</td>
                  <td className="py-2 pr-3 tabular-nums">{n(t.reused)}</td>
                  <td className={`py-2 pr-3 tabular-nums ${t.rateLimited > 0 ? "text-amber-300" : ""}`}>{n(t.rateLimited)}</td>
                  <td className="py-2 pr-3 tabular-nums">{n(t.failed + t.gaveUp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Servers" hint="What each server's clan adds to the load: its active players times how often its tier refreshes them. A clan set up in two servers is polled once, so it counts once in the total.">
        {b.servers.length === 0 ? (
          <p className="text-sm text-muted">No server has a clan set up.</p>
        ) : (
          <ul className="divide-y divide-surface-border text-sm">
            {b.servers.map((s) => (
              <li key={s.guildId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="min-w-0 flex-1 basis-48">
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-muted">
                    Clan {s.clan}
                    {s.sharedWith > 0 ? ` · shared with ${s.sharedWith} other server${s.sharedWith === 1 ? "" : "s"}` : ""}
                  </span>
                </span>
                <span className="text-xs text-muted">{s.tier === "PREMIUM_CLAN" ? "premium" : "standard"}</span>
                <span className="tabular-nums">{n(s.players)} players</span>
                <span className="w-32 text-right tabular-nums">{n(s.requestsPerDay)} a day</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Last two weeks" hint="Requests sent per day, by tier. Saved once a day; the first day shown is today so far.">
        {days.length === 0 ? (
          <p className="text-sm text-muted">No days saved yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th className="py-2 pr-3">Day</th>
                  <th className="py-2 pr-3">Sent</th>
                  <th className="py-2 pr-3">Reused</th>
                  <th className="py-2 pr-3">Rate limited</th>
                  <th className="py-2 pr-3">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {days.map((day) => {
                  const rows = b.history.filter((h) => h.day === day);
                  const sum = (key: "sent" | "reused" | "rateLimited" | "failed") => rows.reduce((total, r) => total + r[key] + (key === "failed" ? r.gaveUp : 0), 0);
                  return (
                    <tr key={day}>
                      <td className="py-2 pr-3">{day}</td>
                      <td className="py-2 pr-3 tabular-nums">{n(sum("sent"))}</td>
                      <td className="py-2 pr-3 tabular-nums">{n(sum("reused"))}</td>
                      <td className="py-2 pr-3 tabular-nums">{n(sum("rateLimited"))}</td>
                      <td className="py-2 pr-3 tabular-nums">{n(sum("failed"))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, detail, warn }: { label: string; value: string; detail?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? "text-amber-300" : ""}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}
