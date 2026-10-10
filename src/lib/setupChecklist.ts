import type { PermissionGroups, ServerSetup, TrackingGroupConfig, WelcomeConfig } from "@/lib/jonnybot-admin";

export interface ChecklistItem {
  id: string;
  label: string;
  /** What finishing it gets you, or what is missing. */
  detail: string;
  done: boolean;
  /** The dashboard page under /dashboard/{server} where it is changed. */
  page: string;
}

/** What a server has set up so far, worked out from its settings, so the checklist is always true and a half-finished setup can simply be picked up again. */
export function setupChecklist(input: {
  setup: ServerSetup;
  permissions: PermissionGroups;
  tracking: TrackingGroupConfig[];
  welcome: Pick<WelcomeConfig, "enabled" | "channelId">;
}): ChecklistItem[] {
  const admin = input.permissions.groups.find((g) => g.key === "admin");
  const feedsOn = input.tracking.filter((g) => g.enabled && g.channels.length > 0).length;

  return [
    {
      id: "admins",
      label: "Admin roles",
      detail: admin && admin.roleIds.length > 0 ? `${admin.roleIds.length} role${admin.roleIds.length === 1 ? "" : "s"} can use the admin tools.` : "Nobody has the Admin level yet, so the admin tools can't be used.",
      done: !!admin && admin.roleIds.length > 0,
      page: "permissions",
    },
    {
      id: "clan",
      label: "Clan",
      detail: input.setup.clanActive ? `Tracking ${input.setup.clanName}.` : input.setup.clanName ? `${input.setup.clanName} is saved but switched off.` : "No clan set. Skip this if it isn't a clan server.",
      done: input.setup.clanActive,
      page: "setup",
    },
    {
      id: "links",
      label: "Link requests",
      detail: input.setup.verificationReviewChannelId ? "Requests to link a RuneScape name have a review channel." : "No review channel, so link requests have nowhere to go.",
      done: input.setup.verificationReviewChannelId !== null,
      page: "setup",
    },
    {
      id: "feeds",
      label: "Clan activity feeds",
      detail: feedsOn > 0 ? `${feedsOn} kind${feedsOn === 1 ? "" : "s"} of clan activity announced.` : "Nothing is announced yet.",
      done: feedsOn > 0,
      page: "tracking",
    },
    {
      id: "welcome",
      label: "Welcome message",
      detail: input.welcome.enabled && input.welcome.channelId ? "New members are greeted." : "New members aren't greeted.",
      done: input.welcome.enabled && input.welcome.channelId !== null,
      page: "welcome",
    },
  ];
}
