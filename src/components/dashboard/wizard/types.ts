import type {
  GuildStructure,
  HubCommandConfig,
  HubCommandDraft,
  HubConfig,
  PermissionGroupDraft,
  PermissionGroups,
  ServerSetup,
  TrackingGroupConfig,
  WelcomeActionResult,
  WelcomeConfig,
  WelcomeDraft,
} from "@/lib/jonnybot-admin";

/** Everything the wizard needs to show and prefill its steps, loaded together when the page opens and again after each step. */
export interface WizardData {
  structure: GuildStructure;
  setup: ServerSetup;
  permissions: PermissionGroups;
  tracking: TrackingGroupConfig[];
  welcome: WelcomeConfig;
  hub: HubConfig;
  /** Only the Admin tier may change who counts as staff or who may use a command. */
  isAdmin: boolean;
}

type Saved = Promise<WelcomeActionResult<null>>;

/** The quick steps' saves, already bound to this server. Each changes only what its questions asked about. */
export interface QuickActions {
  permissions: (input: { adminRoleIds: string[]; supportRoleIds: string[] }) => Saved;
  clan: (input: { clanName: string; reviewChannelId: string | null }) => Saved;
  tracking: (input: { channelId: string | null }) => Saved;
  welcome: (input: { enabled: boolean; channelId: string | null; text: string }) => Saved;
  commands: (input: { enabled: Record<string, boolean> }) => Saved;
}

/** The full editors' own saves, already bound to this server: the same ones the dashboard's pages use. */
export interface FullActions {
  setup: (setup: ServerSetup) => Promise<WelcomeActionResult<ServerSetup>>;
  permissions: (groups: PermissionGroupDraft[]) => Promise<WelcomeActionResult<PermissionGroups>>;
  tracking: (key: string, enabled: boolean, channelIds: string[]) => Promise<{ ok: true; data: undefined } | { ok: false; error: string }>;
  welcome: (draft: WelcomeDraft) => Promise<WelcomeActionResult<WelcomeConfig>>;
  welcomeTest: (draft: WelcomeDraft) => Promise<WelcomeActionResult<{ sent: boolean; channelName: string; dmSent: boolean }>>;
  hub: (key: string, draft: HubCommandDraft) => Promise<WelcomeActionResult<HubCommandConfig>>;
}
