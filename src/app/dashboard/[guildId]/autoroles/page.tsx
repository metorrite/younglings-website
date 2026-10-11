import { AutorolesForm } from "@/components/dashboard/AutorolesForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveGuildAutorolesAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutorolesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [autoroles, structure] = await Promise.all([adminApi.autoroles(guild).then(dashboardData), adminApi.structure(guild).then(dashboardData)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Autoroles" description="Roles JonnyBot gives to everyone who joins the server, with a separate list for bots and an optional delay." />
      <AutorolesForm initial={autoroles} roles={structure.roles} save={saveGuildAutorolesAction.bind(null, guildId)} />
    </div>
  );
}
