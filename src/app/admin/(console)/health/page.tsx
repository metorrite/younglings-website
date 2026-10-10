import { requireAdmin } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "Bot health — Admin — Younglings" };
export const dynamic = "force-dynamic";

const duration = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m`;
};

function Check({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface p-4">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} aria-hidden />
      <div>
        <p className="font-medium">{label}</p>
        {detail && <p className="text-sm text-muted">{detail}</p>}
      </div>
    </div>
  );
}

export default async function HealthPage() {
  const admin = await requireAdmin("/admin/health");
  const result = await adminApi.health(admin);

  if (!result.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Bot health</h1>
        <Check ok={false} label="JonnyBot isn't reachable" detail="The website couldn't get an answer from the bot. If this keeps happening, check the bot's service on Railway." />
      </div>
    );
  }

  const h = result.data;
  const p = h.polling;
  const q = p.queue;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bot health</h1>
        <p className="mt-1 text-sm text-muted">A snapshot taken when this page loaded. Refresh to update it.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Check ok={h.discord.status === "CONNECTED"} label={`Discord: ${h.discord.status.toLowerCase()}`} detail={`Gateway ping ${h.discord.gatewayPingMs} ms · ${h.discord.members} server members`} />
        <Check ok={h.database.ok} label={h.database.ok ? "Database: reachable" : "Database: not answering"} detail={h.database.ok ? `Round trip ${h.database.pingMs} ms` : undefined} />
        <Check ok={h.environment.autoPoll} label={h.environment.autoPoll ? "Automatic updates: on" : "Automatic updates: off"} detail={h.environment.autoPoll ? `Roster refreshed every ${Math.round(p.cycleSeconds / 3600)} hours` : "RUNESCAPE_AUTO_POLL_ENABLED is off, so data only updates when someone asks for it."} />
        <Check ok={p.stale === 0} label={p.stale === 0 ? "Every member's data is fresh" : `${p.stale} members have stale data`} detail={`${p.refreshedRecently} of ${p.rosterSize} refreshed within the last cycle${p.newestRefresh ? ` · newest refresh ${p.newestRefresh.slice(11, 16)} UTC` : ""}`} />
        <Check
          ok={p.rateLimitedQueue === 0}
          label={p.rateLimitedQueue === 0 ? "RuneMetrics: not rate limiting us" : `${p.rateLimitedQueue} players waiting while the bot slows down`}
          detail={q ? `Up to one request every ${q.secondsPerRequest}s${q.slowdown > 1 ? ` (slowed ${q.slowdown}x after a rate limit)` : ""}, bursts of ${q.burst}` : `Polls are spaced about ${p.delaySeconds}s apart`}
        />
        <Check ok={h.environment.siteUrlConfigured} label={h.environment.siteUrlConfigured ? "Website address: set" : "Website address: not set"} detail={h.environment.siteUrlConfigured ? "/wrapped can fetch recap cards." : "Set SITE_URL on the bot so /wrapped can fetch recap cards."} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Uptime", duration(h.uptimeSeconds)],
          ["Memory", `${h.memoryUsedMb} / ${h.memoryMaxMb} MB`],
          ["Environment", h.environment.live ? "Production" : "Development"],
          ["Scheduled posts waiting", String(h.scheduledPending)],
          ["Newest adventure-log entry", h.data.newestActivity ? new Date(h.data.newestActivity).toLocaleString() : "—"],
          ["Tracking since", h.data.firstSnapshot ? new Date(h.data.firstSnapshot).toLocaleDateString() : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs tracking-wider text-muted uppercase">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </section>

      {q && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Poll queue</h2>
          <p className="text-sm text-muted">
            Every RuneMetrics request goes through one queue. A player who was polled recently enough is skipped instead of polled again, and a person pressing
            Update goes to the front.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Waiting", String(q.queued)],
              ["Clan players waiting", String(q.queuedByPriority.CLAN ?? 0)],
              ["Other linked waiting", String(q.queuedByPriority.LINKED ?? 0)],
              ["Being polled now", q.inFlight ?? "—"],
              ["Requests, last minute", String(q.requestsLastMinute)],
              ["Requests, last 10 min", String(q.requestsLast10Minutes)],
              ["Budget in hand", `${q.requestBudget} of ${q.burst}`],
              ["Longest wait", q.oldestWaitingSeconds > 0 ? duration(q.oldestWaitingSeconds) : "—"],
              ["Polled since start", String(q.polled)],
              ["Skipped as recent", String(q.skippedAsRecent)],
              ["Duplicates merged", String(q.mergedDuplicates)],
              ["Rate limited / gave up", `${q.rateLimited} / ${q.gaveUp}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-surface-border bg-surface p-4">
                <p className="text-xs tracking-wider text-muted uppercase">{label}</p>
                <p className="mt-1 text-lg font-semibold break-words">{value}</p>
              </div>
            ))}
          </div>
          {q.jobs.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface">
              <table className="w-full text-sm">
                <thead className="text-left text-xs tracking-wider text-muted uppercase">
                  <tr>
                    <th className="p-3">Recurring job</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Every</th>
                    <th className="p-3">Last run</th>
                    <th className="p-3">Queued then</th>
                  </tr>
                </thead>
                <tbody>
                  {q.jobs.map((job) => (
                    <tr key={job.name} className="border-t border-surface-border">
                      <td className="p-3 font-medium">{job.name}</td>
                      <td className="p-3">{job.priority.toLowerCase().replace("_", " ")}</td>
                      <td className="p-3">{duration(job.periodSeconds)}</td>
                      <td className="p-3">{job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : "not yet"}</td>
                      <td className="p-3">{job.lastRunAt ? job.lastSubmitted : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
