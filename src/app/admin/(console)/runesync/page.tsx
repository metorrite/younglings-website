import { Card, Notice, formatUtc } from "@/components/admin/ui";
import { requireOwner } from "@/lib/admin";
import { adminCall } from "@/lib/jonnybot-admin";

export const metadata = { title: "RuneSync diagnostics — Admin — Younglings" };
export const dynamic = "force-dynamic";

interface RuneSyncDiagnostic {
  id: string;
  discordUserId: string;
  createdAt: string;
  expiresAt: string;
  snapshot: Record<string, unknown>;
}

const field = "w-full max-w-xs rounded-md border border-surface-border bg-background px-3 py-2 font-mono text-sm uppercase outline-none focus:border-gold";
const primary = "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110";

/**
 * Open a RuneSync diagnostics id (T-202): the snapshot a member sent from RuneSync's panel for a bug report. Owner only; the bot checks
 * that too. Snapshots were redacted when stored (no tokens, assertions, tracking ids or chat text) and are kept 14 days.
 */
export default async function RuneSyncDiagnosticsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const admin = await requireOwner("/admin/runesync");
  const id = ((await searchParams).id ?? "").trim().slice(0, 16);
  const found = id ? await adminCall<RuneSyncDiagnostic>(admin, "GET", `runesync/diagnostics/${encodeURIComponent(id)}`) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">RuneSync diagnostics</h1>
        <p className="mt-1 text-sm text-muted">
          Members make an id (like <code>RS-7K2M9Q</code>) with &quot;Copy diagnostics id&quot; in RuneSync&apos;s panel and put it in a bug report. Open it here to see their
          plugin version, settings, queue and last 20 batch results.
        </p>
      </div>

      <Card title="Open an id">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input name="id" defaultValue={id} placeholder="RS-7K2M9Q" aria-label="Diagnostics id" className={field} maxLength={16} autoComplete="off" />
          <button type="submit" className={primary}>
            Open
          </button>
        </form>
      </Card>

      {found && !found.ok && <Notice tone="error" title="Couldn't open that id" items={[found.error]} />}
      {found?.ok && (
        <Card title={found.data.id} hint={`Sent ${formatUtc(found.data.createdAt)} by Discord user ${found.data.discordUserId}; deleted ${formatUtc(found.data.expiresAt)}.`}>
          <pre className="max-h-[32rem] overflow-auto rounded-md border border-surface-border bg-background p-4 text-xs whitespace-pre-wrap break-words">
            {JSON.stringify(found.data.snapshot, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
