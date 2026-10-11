import Link from "next/link";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { describe } from "@/lib/auditText";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

export default async function AuditPage({ params, searchParams }: { params: Promise<{ guildId: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { guildId } = await params;
  const query = await searchParams;
  const guild = await requireGuild(guildId);
  const q = typeof query.q === "string" ? query.q.slice(0, 60) : "";
  const { entries } = await adminApi.audit(guild, { limit: 200, q }).then(dashboardData);
  const base = `/dashboard/${guildId}/audit`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        description="Every change made from this dashboard, newest first. Message text and setting values aren't stored, only what was changed, by whom and when."
      />

      <form className="flex flex-wrap gap-2" action={base}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Filter by person or what changed…"
          aria-label="Filter the activity log"
          className="w-full max-w-sm rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <button className="rounded-md border border-surface-border px-4 py-2 text-sm transition hover:border-gold">Filter</button>
        {q && (
          <Link href={base} className="px-2 py-2 text-sm text-muted hover:text-foreground">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Who</th>
              <th className="px-4 py-2.5 font-medium">What</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Request</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60">
            {entries.map((e) => (
              <tr key={e.id} className="transition hover:bg-white/[0.03]">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted">{new Date(e.at).toLocaleString()}</td>
                <td className="px-4 py-2.5">{e.actorName ?? e.actorId}</td>
                <td className="px-4 py-2.5">{describe(e.method, e.path)}</td>
                <td className="hidden px-4 py-2.5 font-mono text-xs text-muted md:table-cell">
                  {e.method} {e.path}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
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
