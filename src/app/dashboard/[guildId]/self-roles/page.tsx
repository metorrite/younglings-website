import { SelfRolesEditor } from "@/components/admin/SelfRolesEditor";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildSelfRolesAction } from "../bot-pages-actions";

export const metadata = { title: "Self roles — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function SelfRolesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [{ roles: configured }, structure] = await Promise.all([adminApi.selfRoles(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Self roles" description="The roles members can give themselves from their profile page. For roles picked with buttons in a channel, use Role panels." />
      <SelfRolesEditor initial={configured} roles={structure.roles} save={saveGuildSelfRolesAction.bind(null, guildId)} />
    </div>
  );
}
