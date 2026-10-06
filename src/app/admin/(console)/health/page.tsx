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
        <Check ok={p.rateLimitedQueue === 0} label={p.rateLimitedQueue === 0 ? "RuneMetrics: not rate limiting us" : `${p.rateLimitedQueue} players waiting out a rate limit`} detail={`Polls are spaced at least ${p.delaySeconds}s apart`} />
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
    </div>
  );
}
