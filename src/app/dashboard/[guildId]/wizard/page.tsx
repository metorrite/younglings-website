import { SetupWizard } from "@/components/dashboard/wizard/SetupWizard";
import type { FullActions, QuickActions, WizardData } from "@/components/dashboard/wizard/types";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { saveHubCommandAction } from "../commands/actions";
import { savePermissionGroupsAction } from "../permissions/actions";
import { saveServerSetupAction } from "../settings/actions";
import { saveGuildTrackingAction } from "../tracking/actions";
import { saveGuildWelcomeAction, testGuildWelcomeAction } from "../welcome/actions";
import { quickSaveClanAction, quickSaveCommandsAction, quickSavePermissionsAction, quickSaveTrackingAction, quickSaveWelcomeAction } from "./actions";

export default async function SetupWizardPage({ params, searchParams }: { params: Promise<{ guildId: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { guildId } = await params;
  const { mode } = await searchParams;
  const initialPath = mode === "quick" || mode === "full" || mode === "custom" ? mode : null;
  const guild = await requireGuild(guildId);

  const [structure, setup, permissions, tracking, welcome, hub] = await Promise.all([
    adminApi.structure(guild).then(dashboardData),
    adminApi.serverSetup(guild).then(dashboardData),
    adminApi.permissions(guild).then(dashboardData),
    adminApi.tracking(guild).then(dashboardData),
    adminApi.welcome(guild).then(dashboardData),
    adminApi.hub(guild).then(dashboardData),
  ]);
  const data: WizardData = { structure, setup, permissions, tracking: tracking.groups, welcome, hub, isAdmin: guild.tier === "ADMIN" };

  const quick: QuickActions = {
    permissions: quickSavePermissionsAction.bind(null, guildId),
    clan: quickSaveClanAction.bind(null, guildId),
    tracking: quickSaveTrackingAction.bind(null, guildId),
    welcome: quickSaveWelcomeAction.bind(null, guildId),
    commands: quickSaveCommandsAction.bind(null, guildId),
  };
  const full: FullActions = {
    setup: saveServerSetupAction.bind(null, guildId),
    permissions: savePermissionGroupsAction.bind(null, guildId),
    tracking: saveGuildTrackingAction.bind(null, guildId),
    welcome: saveGuildWelcomeAction.bind(null, guildId),
    welcomeTest: testGuildWelcomeAction.bind(null, guildId),
    hub: saveHubCommandAction.bind(null, guildId),
  };

  return <SetupWizard initialPath={initialPath} guildId={guildId} guildName={guild.guildName} data={data} quick={quick} full={full} />;
}
