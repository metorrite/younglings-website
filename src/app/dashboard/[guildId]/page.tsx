import { NoticesEditor } from "@/components/dashboard/overview/NoticesEditor";
import { OverviewView, type FeatureRow } from "@/components/dashboard/overview/OverviewView";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, dashboardApi } from "@/lib/jonnybot-admin";
import { setupChecklist } from "@/lib/setupChecklist";
import { addNoticeAction, removeNoticeAction } from "./notices/actions";

export default async function GuildOverview({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [overview, welcome, setup, permissions, tracking, hub] = await Promise.all([
    adminApi.overview(guild).then(dashboardData),
    dashboardApi.welcome(guild).then(dashboardData),
    adminApi.serverSetup(guild).then(dashboardData),
    adminApi.permissions(guild).then(dashboardData),
    adminApi.tracking(guild).then(dashboardData),
    adminApi.hub(guild).then(dashboardData),
  ]);

  const base = `/dashboard/${guildId}`;
  const checklist = setupChecklist({ setup, permissions, tracking: tracking.groups, welcome });
  const commandsOn = hub.commands.filter((c) => c.enabled).length;

  const rows: FeatureRow[] = [
    ...checklist.map((item) => ({ id: item.id, label: item.label, detail: item.detail, done: item.done, href: `${base}/${item.page}`, action: item.done ? "Manage" : "Set up" })),
    {
      id: "commands",
      label: "Commands",
      detail: commandsOn === hub.commands.length ? "Every command is turned on." : `${commandsOn} of ${hub.commands.length} commands are turned on.`,
      done: commandsOn > 0,
      href: `${base}/commands`,
      action: "Manage",
    },
    {
      id: "tickets",
      label: "Tickets",
      detail: overview.tickets ? `${overview.tickets.open} open.` : "Ticket panels aren't set up here.",
      done: !!overview.tickets,
      where: "Set up in Discord with /configure for now",
    },
    {
      id: "polls",
      label: "Polls and signups",
      detail: `${overview.community.openPolls} poll${overview.community.openPolls === 1 ? "" : "s"} and ${overview.community.openSignups} signup${overview.community.openSignups === 1 ? "" : "s"} open.`,
      done: overview.community.openPolls + overview.community.openSignups > 0,
      where: "Where polls are posted is set in Discord for now",
    },
  ];

  return (
    <OverviewView
      base={base}
      overview={overview}
      setup={setup}
      rows={rows}
      owner={overview.isOwner && <NoticesEditor initial={overview.notices} add={addNoticeAction.bind(null, guildId)} remove={removeNoticeAction.bind(null, guildId)} />}
    />
  );
}
