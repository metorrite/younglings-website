import { MembersTable } from "@/components/admin/MembersTable";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { addGuildNoteAction, deleteGuildNoteAction, loadGuildNotesAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function MembersPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const roster = await adminApi.roster(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader title="Clan roster" description="Every clan member in one place: who is verified, how fresh their data is, and where they stand this Citadel week. Open a member to leave staff-only notes." />
      <MembersTable
        roster={roster}
        exportHref={`/dashboard/${guildId}/members/export`}
        notes={{ load: loadGuildNotesAction.bind(null, guildId), add: addGuildNoteAction.bind(null, guildId), remove: deleteGuildNoteAction.bind(null, guildId) }}
      />
    </div>
  );
}
