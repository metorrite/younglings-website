import { NoticesEditor } from "@/components/dashboard/overview/NoticesEditor";
import { OverviewView, type FeatureRow } from "@/components/dashboard/overview/OverviewView";
import { redirect } from "next/navigation";
import { dashboardData, requireEventAccess, requireGuild } from "@/lib/dashboard";
import { adminApi, dashboardApi } from "@/lib/jonnybot-admin";
import { setupChecklist } from "@/lib/setupChecklist";
import { addNoticeAction, removeNoticeAction } from "./notices/actions";

export default async function GuildOverview({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  // An Event coordinator has no overview: their home is the event manager.
  if ((await requireEventAccess(guildId)).tier === "COORDINATOR") redirect(`/dashboard/${guildId}/event-manager`);
  const guild = await requireGuild(guildId);
  const [overview, welcome, setup, permissions, tracking, hub, checkupResult, favorites] = await Promise.all([
    adminApi.overview(guild).then(dashboardData),
    dashboardApi.welcome(guild).then(dashboardData),
    adminApi.serverSetup(guild).then(dashboardData),
    adminApi.permissions(guild).then(dashboardData),
    adminApi.tracking(guild).then(dashboardData),
    adminApi.hub(guild).then(dashboardData),
    adminApi.checkup(guild), // a bot without the checkup just shows no card
    adminApi.favorites(guild), // and without them, the usual four quick links
  ]);

  const base = `/dashboard/${guildId}`;
  const checklist = setupChecklist({ setup, permissions, tracking: tracking.groups, welcome });
  // Fun commands are off by default on purpose, so they do not count against "every command is turned on".
  const everyday = hub.commands.filter((c) => !c.tags.includes("fun"));
  const funOn = hub.commands.filter((c) => c.tags.includes("fun") && c.enabled).length;
  const commandsOn = everyday.filter((c) => c.enabled).length;
  const funNote = funOn > 0 ? ` ${funOn} fun command${funOn === 1 ? " is" : "s are"} on.` : "";

  const rows: FeatureRow[] = [
    ...checklist.map((item) => ({ id: item.id, label: item.label, detail: item.detail, done: item.done, href: `${base}/${item.page}`, action: item.done ? "Manage" : "Set up" })),
    {
      id: "commands",
      label: "Commands",
      detail: (commandsOn === everyday.length ? "Every command is turned on." : `${commandsOn} of ${everyday.length} commands are turned on.`) + funNote,
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
      checkup={checkupResult.ok ? { errors: checkupResult.data.errors, warnings: checkupResult.data.warnings, checked: checkupResult.data.findings.length } : null}
      setup={setup}
      rows={rows}
      favorites={favorites.ok ? favorites.data.paths : []}
      owner={overview.isOwner && <NoticesEditor initial={overview.notices} add={addNoticeAction.bind(null, guildId)} remove={removeNoticeAction.bind(null, guildId)} />}
    />
  );
}
