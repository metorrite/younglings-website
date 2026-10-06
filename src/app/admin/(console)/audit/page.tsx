import Link from "next/link";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "Audit log — Admin — Younglings" };
export const dynamic = "force-dynamic";

/** Turns an API path into something a person reads: "PUT ticket/settings" → "Changed ticket settings". */
function describe(method: string, path: string): string {
  const parts = path.split("/");
  const noun: Record<string, string> = {
    "ticket/settings": "ticket settings", "ticket/panels": "a ticket panel", selfroles: "self-assignable roles", news: "the news channels", community: "community settings",
    "clan/points": "clan points and ranks", post: "a channel message", polls: "a poll", signups: "a signup sheet", tracking: "a tracking channel", promotions: "a promotion", notes: "a member note", scheduled: "a scheduled post",
  };
  const key = parts.length >= 2 && noun[`${parts[0]}/${parts[1]}`] ? `${parts[0]}/${parts[1]}` : parts[0];
  const what = noun[key] ?? path;
  const verb = method === "DELETE" ? "Deleted" : method === "POST" ? (parts.at(-1) === "done" ? "Marked done:" : parts.at(-1) === "end" ? "Ended" : "Created or sent") : "Changed";
  return `${verb} ${what}`;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const admin = await requireAdmin("/admin/audit");
  const q = typeof query.q === "string" ? query.q.slice(0, 60) : "";
  const { entries } = unwrap(await adminApi.audit(admin, { limit: 200, q }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-muted">Every change made from this dashboard, newest first. Message text and settings values aren&apos;t stored, only what was changed, by whom and when.</p>
      </div>

      <form className="flex gap-2" action="/admin/audit">
        <input name="q" defaultValue={q} placeholder="Filter by person or what changed…" className="w-72 rounded-md border border-surface-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold/60" />
        <button className="rounded-md border border-surface-border px-4 py-1.5 text-sm hover:border-gold/50">Filter</button>
        {q && <Link href="/admin/audit" className="px-2 py-1.5 text-sm text-muted hover:text-foreground">Clear</Link>}
      </form>

      <div className="overflow-hidden rounded-xl border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Who</th>
              <th className="px-4 py-2 font-medium">What</th>
              <th className="hidden px-4 py-2 font-medium md:table-cell">Request</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2 whitespace-nowrap text-muted">{new Date(e.at).toLocaleString()}</td>
                <td className="px-4 py-2">{e.actorName ?? e.actorId}</td>
                <td className="px-4 py-2">{describe(e.method, e.path)}</td>
                <td className="hidden px-4 py-2 font-mono text-xs text-muted md:table-cell">
                  {e.method} {e.path}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  {q ? "Nothing matches that." : "Nothing has been changed from the dashboard yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
