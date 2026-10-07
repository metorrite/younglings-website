import type { PanelDefaults, PanelDefinition } from "@/lib/jonnybot-admin";

/**
 * The starting values for a new ticket panel. Lives outside the editor component on purpose: the editor is a
 * Client Component, and a server page can't call a function exported from one.
 */
export function blankPanel(defaults?: PanelDefaults): PanelDefinition {
  return {
    name: "",
    title: "",
    description: "",
    buttonLabel: "Open a Ticket",
    categoryId: null,
    channelNameTemplate: "ticket-{number}",
    welcomeText: "",
    openingMessage: "{user} Welcome",
    closeByRequester: true,
    closeByHelpers: true,
    enabled: true,
    perUserLimit: 1,
    defaultPingRoleId: null,
    helperCap: null,
    escalationHours: null,
    defaultEscalateRoleId: null,
    helperRoleIds: [],
    staffRoleIds: [],
    closeRoleIds: [],
    fields: [],
    // The server's saved defaults win over the built-in ones above.
    ...defaults,
  };
}
