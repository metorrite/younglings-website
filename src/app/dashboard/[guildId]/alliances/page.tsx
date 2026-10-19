import { AlliancesManager } from "@/components/dashboard/AlliancesManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, type AllianceEvents } from "@/lib/jonnybot-admin";
import {
  acceptAllianceAction,
  createAllianceAction,
  inviteToAllianceAction,
  leaveAllianceAction,
  removeFromAllianceAction,
  setAllianceVisibilityAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AlliancesPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const list = await adminApi.alliances(guild).then(dashboardData);
  // each alliance this server is an active member of has a shared calendar
  const calendars: Record<string, AllianceEvents["events"]> = {};
  await Promise.all(
    list.alliances
      .filter((a) => a.status === "ACTIVE")
      .map(async (a) => {
        const result = await adminApi.allianceEvents(guild, a.id);
        calendars[a.id] = result.ok ? result.data.events : [];
      }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alliances"
        description="Team up with other clans. Allies see the events you share with them on their dashboards, and you see theirs. Nothing is shared with a clan that hasn't accepted."
      />
      <AlliancesManager
        initial={list}
        calendars={calendars}
        actions={{
          create: createAllianceAction.bind(null, guildId),
          invite: inviteToAllianceAction.bind(null, guildId),
          accept: acceptAllianceAction.bind(null, guildId),
          leave: leaveAllianceAction.bind(null, guildId),
          remove: removeFromAllianceAction.bind(null, guildId),
          setVisibility: setAllianceVisibilityAction.bind(null, guildId),
        }}
        eventsHref={`/dashboard/${guildId}/events`}
      />
    </div>
  );
}
