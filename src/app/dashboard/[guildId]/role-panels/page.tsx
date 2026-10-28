import Link from "next/link";
import { RolePanelCards } from "@/components/dashboard/RolePanelCards";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

export default async function RolePanelsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const { panels, maxPanels } = await adminApi.rolePanels(guild).then(dashboardData);
  const base = `/dashboard/${guildId}/role-panels`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role panels"
        description="A message of buttons members press to pick their own roles, such as teams, pings or interests. Make one, then post it in a channel."
        actions={
          panels.length < maxPanels ? (
            <Link href={`${base}/new`} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
              New panel
            </Link>
          ) : undefined
        }
      />

      {panels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
          <p className="font-medium">No role panels yet</p>
          <p className="mt-1 text-sm text-muted">Create one, choose the roles its buttons give, and post it. Members can then pick their roles with a click.</p>
          <Link href={`${base}/new`} className="mt-5 inline-block rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
            Create your first panel
          </Link>
        </div>
      ) : (
        <RolePanelCards panels={panels} base={base} />
      )}
    </div>
  );
}
