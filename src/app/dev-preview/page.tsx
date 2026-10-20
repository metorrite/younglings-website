"use client";
/* eslint-disable react-hooks/purity, react-hooks/refs -- a dev-only harness with made-up data, never shipped */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EventManager } from "@/components/dashboard/EventManager";
import { CitadelWheel } from "@/components/dashboard/CitadelWheel";
import { MyEventsPanel } from "@/components/profile/MyEventsPanel";
import { EventListView, type EventCall } from "@/components/dashboard/EventListView";
import { EventWizard } from "@/components/dashboard/setup/EventWizard";
import { schemas } from "./schemas";
import { ChannelsTab } from "@/components/dashboard/space/ChannelsTab";
import { makeSpaceCall, spaceDetail } from "./spaceMock";
import { TeamBuilder } from "@/components/dashboard/teams/TeamBuilder";
import { initialTeamsDetail, makeTeamsCall } from "./teamsMock";
import { useEffect, useRef, useState } from "react";
import type { OptionSchema } from "@/lib/eventOptions";
import { AutorolesForm } from "@/components/dashboard/AutorolesForm";
import { RolePanelEditor } from "@/components/dashboard/RolePanelEditor";
import { GiveawaysManager } from "@/components/dashboard/GiveawaysManager";
import { ServerRemindersManager } from "@/components/dashboard/ServerRemindersManager";
import { LockdownManager } from "@/components/dashboard/LockdownManager";
import { SuggestionsManager } from "@/components/dashboard/SuggestionsManager";
import { AutoCleanManager } from "@/components/dashboard/AutoCleanManager";
import { AutopunishEditor } from "@/components/dashboard/AutopunishEditor";
import { AutoDeleteManager } from "@/components/dashboard/AutoDeleteManager";
import { ClanProfileForm } from "@/components/dashboard/ClanProfileForm";
import { ListingsModerator } from "@/components/dashboard/ListingsModerator";
import { PublicEventsManager } from "@/components/dashboard/PublicEventsManager";
import { WarningsManager } from "@/components/dashboard/WarningsManager";
import { ModLogForm } from "@/components/dashboard/ModLogForm";
import { AccountGateForm } from "@/components/dashboard/AccountGateForm";
import { HubEditor } from "@/components/dashboard/HubEditor";
import { PermissionGroupsEditor } from "@/components/dashboard/PermissionGroupsEditor";
import { ServerSetupForm } from "@/components/dashboard/ServerSetupForm";
import { WelcomeEditor } from "@/components/admin/WelcomeEditor";
import { TrackingEditor, CommunitySettingsForm } from "@/components/admin/AdminExtras";
import { AutoRepliesEditor } from "@/components/dashboard/AutoRepliesEditor";
import { TicketsOverview } from "@/components/dashboard/tickets/TicketsOverview";
import { TicketHistoryList } from "@/components/dashboard/tickets/TicketHistoryList";
import { TicketTabs } from "@/components/dashboard/TicketTabs";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PanelDefaultsForm } from "@/components/admin/PanelDefaultsForm";
import { PanelEditor } from "@/components/admin/PanelEditor";
import { GuideCards } from "@/components/dashboard/wizard/GuideCards";
import { SetupWizard } from "@/components/dashboard/wizard/SetupWizard";
import { GoodbyeForm } from "@/components/dashboard/GoodbyeForm";
import { SnapshotsManager } from "@/components/dashboard/SnapshotsManager";
import { AutomodForm } from "@/components/dashboard/AutomodForm";
import { PostTool } from "@/components/admin/AdminExtras";
import { ScheduledPosts } from "@/components/admin/ScheduledPosts";
import { StarboardForm } from "@/components/dashboard/StarboardForm";
import { PointsManager } from "@/components/dashboard/PointsManager";
import { RolePanelCards } from "@/components/dashboard/RolePanelCards";
import type { WelcomeConfig, WelcomeActionResult } from "@/lib/jonnybot-admin";
import { OverviewView, type FeatureRow } from "@/components/dashboard/overview/OverviewView";
import { Sidebar } from "@/components/dashboard/shell/Sidebar";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import type { GuildStructure, Overview, ServerSetup } from "@/lib/jonnybot-admin";

// A throwaway harness for looking at the dashboard's new design with made-up data. Not committed (see .git/info/exclude).
const overview: Overview = {
  members: { rosterSize: 66, linked: 62, unverified: 4, stale: 2, inactive: 7, promotionsDue: 3, discordMembers: 182 },
  community: { openSignups: 1, openPolls: 1 },
  tickets: { open: 2, escalated: 0, flagged: 0 },
  health: { ok: true, problems: [], uptimeSeconds: 100000, autoPoll: true },
  notices: [],
  isOwner: false,
};
const setup: ServerSetup = { clanName: "Younglings", clanEnabled: true, clanActive: true, verificationReviewChannelId: "1", renameAlertChannelId: null, verifiedClanRoleId: "r1", verifiedNonClanRoleId: null, unverifiedRoleId: null, onboardingRoleId: null, inviteUrl: "https://discord.gg/younglings" };
const structure: GuildStructure = {
  roles: [
    { id: "r1", name: "Member", color: 0, managed: false, position: 3 },
    { id: "r2", name: "Guest", color: 0, managed: false, position: 2 },
  ],
  categories: [{ id: "c1", name: "Text" }],
  channels: [
    { id: "1", name: "link-requests", category: "c1", canPost: true },
    { id: "2", name: "general", category: "c1", canPost: true },
  ],
};
const welcomeEmpty: WelcomeConfig = {
  enabled: false, messageType: "EMBED", channelId: null, channelName: null, alsoDm: false, content: "", color: null, title: "", titleUrl: "", description: "", authorName: "", authorIconUrl: "",
  thumbnailUrl: "", imageUrl: "", footerText: "", footerIconUrl: "", fields: [], linkButton: false, linkButtonLabel: "Link your RuneScape name", linkButtonStyle: "primary", footerStyle: "small",
  serverName: "Younglings", memberCount: 182, serverIconUrl: null,
};
const welcomeFull: WelcomeConfig = {
  ...welcomeEmpty, enabled: true, channelId: "2", channelName: "general", alsoDm: true, color: 0x5865f2, title: "Welcome to {server}", description: "Hi {user}, you are member number {count}. Read the rules in #rules, then say hello.",
  footerText: "Younglings, a friendly RuneScape clan", linkButton: true, fields: [{ name: "Get started", value: "Run /rs to link your name.", inline: false }],
};
const trackingGroups = [
  { key: "NOTABLE_DROPS", source: "RuneMetrics", name: "Notable Drops", enabled: true, channels: [{ channelId: "2", name: "general" }] },
  { key: "QUESTS", source: "RuneMetrics", name: "Quests & Quest Points", enabled: true, channels: [] },
  { key: "PETS", source: "RuneMetrics", name: "Pets", enabled: false, channels: [] },
  { key: "BOSS_KILLS", source: "RuneMetrics", name: "Boss & Monster Milestones", enabled: true, channels: [{ channelId: "2", name: "general" }] },
  { key: "CITADEL_ACTIVITY", source: "Clan Citadel", name: "Citadel Activity", enabled: false, channels: [] },
  { key: "WEEKLY_CITADEL_REPORT", source: "Clan Citadel", name: "Weekly Citadel Report", enabled: true, channels: [{ channelId: "2", name: "general" }] },
  { key: "CLAN_JOINS_LEAVES", source: "Clan Roster", name: "Clan Joins & Leaves", enabled: true, channels: [{ channelId: "1", name: "link-requests" }] },
  { key: "SERVER_SETTINGS", source: "Discord Admin Log", name: "Server Settings", enabled: false, channels: [] },
  { key: "MESSAGES", source: "Discord Admin Log", name: "Messages", enabled: false, channels: [] },
];
const autoReplies = {
  max: 25, maxTrigger: 100, maxReply: 1000, minCooldown: 5, maxCooldown: 86400,
  replies: [
    { id: "1", trigger: "what is a ca", match: "WORD", reply: "Combat Achievements are a set of boss challenges. See /ca to look one up.", cooldownSeconds: 30, enabled: true },
    { id: "2", trigger: "!rules", match: "STARTS", reply: "Read the rules in #rules, {user}.", cooldownSeconds: 600, enabled: true },
    { id: "3", trigger: "hello jonnybot", match: "EXACT", reply: "Hello {user}!", cooldownSeconds: 30, enabled: false },
  ],
};
const ticketStats = { open: 4, closed: 31, escalated: 1, flagged: 0, avgHoursToClose: 5.2, avgMinutesToFirstHelper: 18, byPanel: [], byWeek: [{ weekStart: "2026-09-21", opened: 6 }, { weekStart: "2026-09-28", opened: 9 }, { weekStart: "2026-10-05", opened: 4 }], topHelpers: [{ id: "1", name: "Metorrite", tickets: 14 }, { id: "2", name: "PvmRyan", tickets: 9 }] };
const ticketPanels = [
  { id: "1", name: "CA Help", title: "Combat Achievement help", enabled: true, helperCap: 3, postedChannelId: "2", fieldCount: 3, openTickets: 3 },
  { id: "2", name: "Support", title: "Ask staff a question", enabled: true, helperCap: null, postedChannelId: null, fieldCount: 1, openTickets: 1 },
  { id: "3", name: "Old applications", title: "Apply to join", enabled: false, helperCap: null, postedChannelId: "2", fieldCount: 5, openTickets: 0 },
];
const ticketRows = [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), number: 40 + n, panelId: String((n % 2) + 1), panelName: n % 2 ? "CA Help" : "Support", channelId: null, requesterId: "9", requesterName: ["Metorrite", "PvmRyan", "Zezima", "Woox", "Zilyana", "Jad"][n - 1], status: n < 3 ? "OPEN" : "CLOSED", routingLabel: n % 2 ? "Elite" : null, answers: [], createdAt: "2026-10-1" + n + "T12:00:00Z", escalatedAt: null, closedAt: null, closedBy: null, closeReason: null, channelDeleted: false }));
const ticketSettings = { logChannelId: "2", nextNumber: 42, transcriptDm: true, closeDelaySeconds: 10, transcriptRetentionDays: null, autoCloseDays: null };
const panelDefaults = { buttonLabel: "Open a ticket", categoryId: "c1", channelNameTemplate: "ticket-{number}", welcomeText: "", openingMessage: "", perUserLimit: 1, defaultPingRoleId: null, helperCap: null, escalationHours: null, defaultEscalateRoleId: null, closeByRequester: true, closeByHelpers: false, helperRoleIds: ["r2"], staffRoleIds: ["r1"], closeRoleIds: [] };
const ticketPanel = { id: "1", name: "CA Help", title: "Combat Achievement help", description: "Open a ticket and a helper will join you.", buttonLabel: "Get CA help", categoryId: "c1", channelNameTemplate: "ca-{number}", welcomeText: "", openingMessage: "", closeByRequester: true, closeByHelpers: false, helpKind: "NONE", enabled: true, perUserLimit: 1, defaultPingRoleId: "r2", helperCap: 3, escalationHours: null, defaultEscalateRoleId: null, postedChannelId: "2", postedMessageId: "9", helperRoleIds: ["r2"], staffRoleIds: ["r1"], closeRoleIds: [], fields: [{ label: "Which boss?", kind: "SHORT", required: true, placeholder: null, maxLength: null, purpose: "NONE", options: [] }, { label: "Tier", kind: "SELECT", required: true, placeholder: null, maxLength: null, purpose: "NONE", options: [{ label: "Elite", pingRoleId: null, escalateRoleId: null }, { label: "Master", pingRoleId: "r1", escalateRoleId: null }] }] };
const pointsOverview = {
  enabled: true, unit: "points", reviewChannelId: "1", maxPerEntry: 100000,
  totals: { members: 41, outstanding: 182400, awarded: 250000, spent: 67600 },
  top: [{ userId: "1", userName: "Metorrite", points: 24500 }, { userId: "2", userName: "PvmRyan", points: 18200 }, { userId: "3", userName: "Zezima", points: 9100 }, { userId: "4", userName: "Woox", points: 4300 }],
  recent: [
    { id: "1", userName: "Metorrite", points: 500, category: "MANUAL", reason: "Hosted the Friday raid", awardedByName: "PvmRyan", createdAt: "2026-10-17T20:00:00Z" },
    { id: "2", userName: "Zezima", points: -2000, category: "REDEMPTION", reason: "Custom role colour", awardedByName: null, createdAt: "2026-10-17T18:30:00Z" },
    { id: "3", userName: "Woox", points: 1200, category: "SUBMISSION", reason: "Screenshot of a Zuk kill", awardedByName: "Metorrite", createdAt: "2026-10-16T12:00:00Z" },
  ],
};
const pointsSubmissions = { pending: [{ id: "7", userName: "Woox", description: "Hard mode Zuk kill, first try", proofUrl: "/favicon.ico", createdAt: "2026-10-17T21:00:00Z" }, { id: "8", userName: "Jad", description: "Max cape", proofUrl: "/favicon.ico", createdAt: "2026-10-17T22:00:00Z" }], decided: [{ id: "6", userName: "Zezima", status: "APPROVED", pointsAwarded: 1200, description: "Raid purple", decisionNote: "Nice one", decidedByName: "Metorrite", decidedAt: "2026-10-16T12:00:00Z", createdAt: "2026-10-16T11:00:00Z" }] };
const pointsRewards = { rewards: [{ id: "1", name: "Custom role colour", description: "Pick any colour for your role", cost: 2000, stock: null, active: true }, { id: "2", name: "Bond", description: "", cost: 15000, stock: 3, active: true }, { id: "3", name: "Old reward", description: "No longer offered", cost: 500, stock: 0, active: false }] };
const pointsRedemptions = { pending: [{ id: "4", userName: "Zezima", rewardName: "Bond", cost: 15000, createdAt: "2026-10-17T19:00:00Z" }], handled: [] };
const automodRule = (key: string, label: string, enabled = false, over: Record<string, unknown> = {}) => ({ key, label, enabled, warn: false, limit: 0, seconds: 0, words: [] as string[], ...over });
const automod = {
  enabled: true, canDelete: true, maxWords: 200, maxDomains: 50, exemptRoles: [] as string[], exemptChannels: [] as string[],
  rules: [
    automodRule("INVITES", "Invites", true),
    automodRule("LINKS", "Links", true, { words: ["runescape.com", "youtube.com"] }),
    automodRule("BLOCKED_WORDS", "Blocked words", false),
    automodRule("CAPS", "Capital letters", false, { limit: 70, seconds: 8 }),
    automodRule("MENTIONS", "Mentions", true, { limit: 5 }),
    automodRule("SPAM", "Spam", true, { limit: 5, seconds: 6 }),
    automodRule("REPEAT", "Repeated messages", false, { limit: 3, seconds: 30 }),
    automodRule("EMOJI", "Emoji", false, { limit: 10 }),
  ],
};
const scheduledPosts = [
  { id: "1", status: "PENDING", channelName: "general", sendAt: "2026-10-21T18:00:00Z", text: "### Weekly Cap Party!\nJoin us at the Citadel on Wednesday.", createdByName: "Metorrite", error: null },
  { id: "2", status: "PENDING", channelName: "link-requests", sendAt: "2026-10-25T09:00:00Z", text: "Clan meeting this Sunday.", createdByName: "PvmRyan", error: null },
  { id: "3", status: "SENT", channelName: "general", sendAt: "2026-10-14T18:00:00Z", text: "Last week's announcement", createdByName: "Metorrite", error: null },
  { id: "4", status: "FAILED", channelName: "deleted-channel", sendAt: "2026-10-07T18:00:00Z", text: "Could not be posted", createdByName: "Metorrite", error: "Missing access" },
];
const hub = {
  maxList: 10,
  groups: [{ ref: "group:admin", name: "Admin", builtin: true }, { ref: "group:support", name: "Support", builtin: true }],
  commands: [
    { key: "rs", title: "RuneScape stats", slashName: "rs", description: "Look up a player and link a RuneScape name.", defaultAccess: "Everyone", enabled: true, customAccess: false, allowedRefs: [], channelIds: [] },
    { key: "signup", title: "Signups", slashName: "signup", description: "Create sign-up sheets for events.", defaultAccess: "Admins", enabled: true, customAccess: true, allowedRefs: ["group:support"], channelIds: ["2"], signup: { adminChannelId: null, lockAdminChannel: false, publicChannelIds: [] } },
    { key: "afk", title: "Away status", slashName: "afk", description: "Mark yourself away: people who mention you are told, and it clears when you next speak.", defaultAccess: "Everyone", enabled: true, customAccess: false, allowedRefs: [], channelIds: [], afk: { nicknameTag: true, ignoreChannelIds: ["2"], away: [{ userId: "11", name: "Axley", reason: "Raids tonight", since: "2026-10-19T09:00:00Z" }, { userId: "12", name: "Berserker87", reason: "", since: "2026-10-18T20:00:00Z" }] } },
    { key: "poll", title: "Polls", slashName: "poll", description: "Start a poll in a channel.", defaultAccess: "Admins", enabled: false, customAccess: false, allowedRefs: [], channelIds: [] },
  ],
};
const perms = {
  maxCustomGroups: 10, maxRolesPerGroup: 10, maxNameLength: 30,
  groups: [
    { key: "admin", name: "Admin", builtin: true, includeHigher: true, roleIds: ["r1"] },
    { key: "support", name: "Support", builtin: true, includeHigher: false, roleIds: [] },
    { key: "developer", name: "Developer", builtin: true, includeHigher: false, roleIds: [] },
    { key: "webdev", name: "Web Dev", builtin: false, includeHigher: false, roleIds: ["r2"] },
  ],
};
const rows: FeatureRow[] = [
  { id: "clan", label: "Your clan", detail: "Tracking Younglings.", done: true, href: "#", action: "Manage" },
  { id: "roles", label: "Roles & permissions", detail: "Admin, Support and Developer are set.", done: true, href: "#", action: "Manage" },
  { id: "tracking", label: "Activity announcements", detail: "No channels chosen yet.", done: false, href: "#", action: "Set up" },
  { id: "welcome", label: "Welcome message", detail: "Not set up.", done: false, href: "#", action: "Set up" },
  { id: "commands", label: "Commands", detail: "Every command is turned on.", done: true, href: "#", action: "Manage" },
  { id: "tickets", label: "Tickets", detail: "2 open.", done: true, where: "Set up in Discord with /configure for now" },
];


const evSummary = { archived: false, id: "9", name: "Friday Night Bingo", description: "Clan bingo, teams of three.", template: "bingo", status: "SIGNUPS" as const, scope: "PRIVATE" as const, scoringMode: "TEAM" as const, startsAt: null, endsAt: null, maxParticipants: 12, config: { board: { size: 3, seed: 5, keys: ["a","b","c","d","e","f","g","h","i"] }, bonuses: [{ name: "Row 1", keys: ["a","b","c"], points: 40 }, { name: "Blackout", keys: ["a","b","c","d","e","f","g","h","i"], points: 100 }], queue: "CLAN_FIRST", teamPolicy: "clanVsOutsiders", buyIn: { enabled: true, kind: "IN_GAME", amount: 5000000, showPot: true } }, createdAt: "2026-10-11T12:00:00Z" };
const evDetail = { tiles: [{ key: "a", boss: "Nex", item: "Torva boots", icon: "torva_boots" }, { key: "b", boss: "Kalphite King", item: "Drygore mace", icon: "drygore_mace" }, { key: "c", boss: null, item: "Fire cape", icon: null }, { key: "d", boss: "Nex", item: "Virtus wand", icon: "virtus_wand" }], organisers: [{ userId: "11", userName: "KinkyAstroid" }], refused: [{ userId: "12", userName: "Late Joiner", reason: "This event isn't open to players from other servers.", at: "2026-10-12T10:00:00Z" }], event: evSummary, objectives: [{ key: "a", label: "Kill Zuk", description: "", points: 10, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] },{ key: "b", label: "Zuk cape", description: "", points: 50, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] },{ key: "c", label: "Fire cape", description: "", points: 25, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] },{ key: "d", label: "100 Barrows chests", description: "", points: 25, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] },{ key: "e", label: "Vorkath x25", description: "", points: 50, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] },{ key: "f", label: "Max cape", description: "", points: 100, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] },{ key: "g", label: "Raids purple", description: "", points: 50, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] },{ key: "h", label: "Arch-Glacor drop", description: "", points: 50, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] },{ key: "i", label: "Quest cape", description: "", points: 25, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: [] }], teams: [{ id: "1", name: "Red", captainId: "10" }, { id: "2", name: "Blue", captainId: null }], participants: [{ userId: "10", userName: "Metorrite", guildId: "1", teamId: "1", joinedAt: "2026-10-11T12:00:00Z", kind: "HOME_CLAN" as const, waiting: false, buyIn: "PAID" as const, verification: "VERIFIED" as const, verifiedBy: "KinkyAstroid", verifiedAt: "2026-10-12T09:00:00Z", verificationNote: "" }, { userId: "11", userName: "KinkyAstroid", guildId: "1", teamId: "2", joinedAt: "2026-10-11T12:01:00Z", kind: "HOME_OTHER" as const, waiting: false, buyIn: "DUE" as const, verification: "PENDING" as const, verifiedBy: null, verifiedAt: null, verificationNote: "" }, { userId: "12", userName: "Late Joiner", guildId: "2", teamId: null, joinedAt: "2026-10-11T12:02:00Z", kind: "PARTNER" as const, waiting: true, buyIn: "DUE" as const, verification: "REJECTED" as const, verifiedBy: "Metorrite", verifiedAt: "2026-10-12T09:05:00Z", verificationNote: "The bank was cropped" }], signup: { attached: true, active: true, entries: 3, channelsChosen: true }, prizes: [{ id: "1", place: 1, placeTo: 1, kind: "IN_GAME" as const, description: "Zaros godsword", amount: 0, percentOfPot: 0, split: "EACH" as const }, { id: "2", place: 2, placeTo: 3, kind: "CLAN_POINTS" as const, description: "", amount: 500, percentOfPot: 0, split: "EQUAL" as const }], pot: 5000000, potVisible: true, buyInEnabled: true, nextStages: ["RUNNING" as const, "CANCELLED" as const], editable: true, prep: { ready: false, blockers: ["Close signups."], warnings: ["1 player isn't verified, so they won't count once the gate has passed. Verify, waive or remove them."], steps: [{ key: "build", label: "Build the event", state: "DONE" as const, required: true, detail: "The objectives are set.", blockers: [] }, { key: "signups", label: "Signups", state: "ACTIVE" as const, required: true, detail: "Open: 2 players and 1 waiting so far. Close signups when you have everyone.", blockers: ["Close signups."] }, { key: "roster", label: "Roster", state: "WAITING" as const, required: true, detail: "Close signups first.", blockers: [] }, { key: "verification", label: "Verification", state: "ACTIVE" as const, required: false, detail: "1 verified, 1 waiting for a decision. Players must pass before teams are made.", blockers: [] }] }, setup: { signupsClosedAt: null, signupsClosedBy: null, rosterConfirmedAt: null, rosterConfirmedBy: null }, verification: { required: true, gate: "TEAMS" as const, instructions: "A screenshot of your bank showing your loot caskets, taken today.", verified: 1, waived: 0, pending: 1, rejected: 0 } };

const shapeKeys = Array.from({ length: 15 }, (_, i) => "tile-" + (i + 1));
const shapeLabels = ["Nex: Torva boots", "Araxxor: Araxxi's web", "Telos: Dormant anima core helm", "Kill Vorago", "Kalphite King: Drygore mace", "Get a pet drop", "Complete a Slayer task", "Nex: Pernix cowl", "Reach a new 99", "Kill Solak", "Kill Nex", "Abyssal demon: Abyssal whip", "Kill Telos", "Hand in a clue scroll", "Kill Araxxor"];
const shapeRows = [[1], [2, 3], [4, 5, 6], [7, 8, 9, 10], [11, 12, 13, 14, 15]];
const shapeRequires: Record<string, number[]> = { "1": [2, 3], "2": [4, 5], "3": [5, 6], "4": [7, 8], "5": [8, 9], "6": [9, 10], "7": [11, 12], "8": [12, 13], "9": [13, 14], "10": [14, 15] };
const shapeDetail = {
  ...evDetail,
  layout: { id: "pyramid", name: "Pyramid of the Pharaohs", blurb: "15 tiles in five tiers.", rule: "Build upwards: a tile opens once the two tiles beneath it are done. Finishing a whole tier earns a bonus.", tiles: 15, rows: shapeRows, rowNames: ["Apex", "Tier 4", "Tier 3", "Tier 2", "Base"], requires: shapeRequires, unlock: "locked" as const },
  tiles: shapeKeys.map((key, i) => ({ key, boss: shapeLabels[i].includes(": ") ? shapeLabels[i].split(": ")[0] : null, item: shapeLabels[i].includes(": ") ? shapeLabels[i].split(": ")[1] : shapeLabels[i], icon: null })),
  objectives: shapeKeys.map((key, i) => ({ key, label: shapeLabels[i], description: "", points: 25 + (14 - i) * 5, evidence: "EITHER" as const, target: 1, repeatLimit: 1, prerequisites: (shapeRequires[String(i + 1)] ?? []).map((n) => "tile-" + n) })),
  editable: true,
  event: { ...evDetail.event, status: "DRAFT" as const, template: "bingo", config: { board: { size: 0, seed: 3, keys: shapeKeys, layout: "pyramid", unlock: "locked" as const }, boardChannelId: undefined } },
};
const evClaims = { pending: [{ id: "4", objective: "cape", userId: "11", userName: "KinkyAstroid", amount: 1, note: "Got the cape!", proofUrl: "https://example.com/p.png", status: "PENDING" as const, decidedByName: null, decisionNote: null, createdAt: "2026-10-11T12:30:00Z" }], decided: [] };
const myEvents = { events: [
  { id: "9", name: "Friday Night Bingo", description: "", template: "bingo", status: "RUNNING" as const, scoringMode: "TEAM" as const, waiting: false, team: "Red", buyIn: { enabled: true, amount: 5000000, status: "DUE" as const }, rank: 2, of: 6, points: 135, pendingProof: 1, verification: { required: true, state: "PENDING" as const, note: "", instructions: "Send a screenshot of your bank." }, awards: [], objectives: [{ key: "a", label: "Kill Zuk", points: 50, target: 1, repeatLimit: 1, done: 1 }, { key: "b", label: "Fire cape", points: 25, target: 1, repeatLimit: 1, done: 0 }, { key: "c", label: "Vorkath x25", points: 50, target: 1, repeatLimit: 1, done: 1 }] },
  { id: "7", name: "Slayer Race", description: "", template: "competition", status: "DONE" as const, scoringMode: "INDIVIDUAL" as const, waiting: false, team: null, buyIn: { enabled: false, amount: 0, status: "NONE" as const }, rank: 1, of: 14, points: 420, pendingProof: 0, verification: { required: false, state: "NOT_REQUIRED" as const, note: "", instructions: "" }, awards: [{ place: 1, kind: "IN_GAME" as const, description: "Zaros godsword", amount: 0, status: "PENDING" as const }, { place: 1, kind: "CLAN_POINTS" as const, description: "", amount: 500, status: "PAID" as const }], objectives: [{ key: "xp-gained", label: "Slayer XP gained", points: 1, target: 10000, repeatLimit: 1000, done: 420 }] },
  { id: "5", name: "Waitlisted Hunt", description: "", template: "scavenger-hunt", status: "SIGNUPS" as const, scoringMode: "INDIVIDUAL" as const, waiting: true, team: null, buyIn: { enabled: false, amount: 0, status: "NONE" as const }, rank: 0, of: 0, points: 0, pendingProof: 0, verification: { required: true, state: "REJECTED" as const, note: "The bank was cropped", instructions: "Send a screenshot of your bank." }, awards: [], objectives: [] },
], open: [{ id: "11", name: "Sunday Boss Night", description: "", template: "custom", scoringMode: "TEAM" as const, signupClosesAt: "2026-10-20T18:00:00Z", buyIn: 2000000, closed: false, verification: true }, { id: "12", name: "Closed Night", description: "", template: "bingo", scoringMode: "INDIVIDUAL" as const, signupClosesAt: null, buyIn: 0, closed: true, verification: false }] };
const evStandings = { scoringMode: "TEAM" as const, standings: [{ rank: 1, subject: "t:1", kind: "TEAM" as const, label: "Red", points: 150, objectivesCompleted: 2, completions: {}, bonuses: [] }, { rank: 2, subject: "t:2", kind: "TEAM" as const, label: "Blue", points: 50, objectivesCompleted: 1, completions: {}, bonuses: [] }] };
const evAwards = [{ id: "1", place: 1, userId: "10", userName: "Metorrite", kind: "IN_GAME" as const, description: "Zaros godsword", amount: 0, status: "PAID" as const, history: [{ from: "PENDING", to: "PAID", byName: "Metorrite", note: "handed over", at: "2026-10-11T13:00:00Z" }] }];

const nope = async () => ({ ok: false as const, error: "Preview only", problems: [] });

const previewKinds = Object.entries(schemas).map(([key, sc]) => ({ key, label: (sc as OptionSchema).label, description: (sc as OptionSchema).description }));
const previewDrafts = { max: 20, drafts: [
  { id: "5", template: "bingo", templateLabel: "Bingo", stream: "guided", step: "RULES", title: "Saturday Pyramid bingo", createdBy: "10", createdByName: "Metorrite", createdAt: "2026-10-15T10:00:00Z", updatedAt: "2026-10-15T10:20:00Z", missingCount: 0 },
  { id: "6", template: "boss-night", templateLabel: "Boss night", stream: "guided", step: "BASICS", title: "Boss night", createdBy: "11", createdByName: "KinkyAstroid", createdAt: "2026-10-15T11:00:00Z", updatedAt: "2026-10-15T11:05:00Z", missingCount: 1 },
] };
const previewTemplates = { max: 50, templates: [
  { id: "1", name: "Weekly clue hunt", description: "Six clues, in order, prizes for the top three.", template: "scavenger-hunt", templateLabel: "Scavenger hunt", available: true, scoringMode: "INDIVIDUAL" as const, days: 7, prizes: 3, createdBy: "10", createdByName: "Metorrite", createdAt: "2026-10-10T10:00:00Z" },
  { id: "2", name: "Clan bingo night", description: "", template: "bingo", templateLabel: "Bingo", available: true, scoringMode: "TEAM" as const, days: 2, prizes: 2, createdBy: "10", createdByName: "Metorrite", createdAt: "2026-10-11T10:00:00Z" },
  { id: "3", name: "Old race", description: "Made for a kind of event that no longer exists.", template: "race", templateLabel: "race", available: false, scoringMode: "INDIVIDUAL" as const, days: 3, prizes: 0, createdBy: "10", createdByName: null, createdAt: "2026-10-01T10:00:00Z" },
] };
const previewStructure = { roles: [], categories: [{ id: "c1", name: "Events" }], channels: [
  { id: "1", name: "bingo-signup", category: "c1", canPost: true },
  { id: "2", name: "staff-events", category: "c1", canPost: true },
  { id: "3", name: "bingo-board", category: "c1", canPost: true },
  { id: "4", name: "event-proof", category: "c1", canPost: true },
], forums: [], threads: [] } as unknown as GuildStructure;
const draftOf = (template: string, answers: unknown, step = "BASICS") => ({ id: "99", template, templateLabel: (schemas[template] as OptionSchema).label, stream: "guided", step, title: "Preview", createdBy: "10", createdByName: "Metorrite", createdAt: "2026-10-16T10:00:00Z", updatedAt: "2026-10-16T10:00:00Z", missingCount: 0, answers, missing: [] });
const setupCall: EventCall = async (method, path, body) => {
  const schema = path.match(/^events\/setup\/schema\/(.+)$/);
  if (schema) return schemas[schema[1]] ? { ok: true, data: schemas[schema[1]] } : { ok: false, error: "No such kind.", problems: [] };
  if (path === "events/drafts" && method === "POST") {
    const kind = (body as { template: string }).template;
    return { ok: true, data: { draft: draftOf(kind, (schemas[kind] as OptionSchema).standard) } };
  }
  if (/^events\/drafts\/\d+$/.test(path) && method === "PUT") return { ok: true, data: { draft: draftOf("bingo", (body as { answers: unknown }).answers) } };
  if (/^events\/drafts\/\d+$/.test(path) && method === "DELETE") return { ok: true, data: previewDrafts };
  if (/^events\/saved-templates\/\d+$/.test(path) && method === "DELETE") return { ok: true, data: { max: 50, templates: previewTemplates.templates.slice(1) } };
  return { ok: false, error: "The preview can't make events.", problems: ["Preview only. Nothing was created."] };
};
/** The bot's schema snapshot predates the channel options: add the board's three, and switch the roles-and-channels answer on, so the row can be looked at. */
function withSlots(schema: OptionSchema): OptionSchema {
  const opt = (path: string, label: string, hint: string, type: string, extra: object = {}) =>
    ({ path, label, hint, step: "DISCORD", type, widget: null, standard: null, required: { always: false }, showWhen: null, choices: [], min: null, max: null, maxLength: null, quick: false, numeric: false, ...extra }) as unknown as OptionSchema["options"][number];
  const existing = { path: "config.channels.slots.board.use", value: "existing", negate: false };
  const create = { path: "config.channels.slots.board.use", value: "create", negate: false };
  return {
    ...schema,
    standard: { ...schema.standard, config: { ...(schema.standard.config as object), channels: { enabled: true, slots: { board: { use: "create" } }, names: {} } } },
    options: [
      ...schema.options,
      opt("config.channels.slots.board.use", "Live board", "The bingo's board picture, posted when the event starts and kept up to date.", "CHOICE", { standard: "create", choices: [{ value: "create", label: "JonnyBot makes it", hint: "" }, { value: "existing", label: "Use a channel I already have", hint: "" }, { value: "none", label: "Leave it out", hint: "" }] }),
      opt("config.channels.slots.board.channelId", "Live board channel", "The channel to use.", "CHANNEL", { showWhen: existing, required: { always: false, when: existing } }),
      opt("config.channels.names.board", "Live board name", "{event} is the event's name. Leave it empty for the usual: {event} Live Board.", "TEXT", { showWhen: create, maxLength: 100 }),
    ],
  };
}

const wizardKind = (): string => (typeof window === "undefined" ? "bingo" : (new URLSearchParams(window.location.search).get("k") ?? "bingo"));
const wheelNames = ["UntamedWrath", "S1GENERAL", "Xtusy", "Nexersys7", "Sprinkzzz", "Big_Don", "Burningsol1", "Berserker87", "wishmakerz", "Hodant", "XHailGailX", "Joel Hendrix"];
const pendingPrize = { status: "PENDING" as const, amount: null, paidBy: null, paidByName: null, recipient: null, recipientName: null, givenBy: null, givenByName: null, givenAt: null, note: null, inCoffer: false };
const wheelWinner = (end: string, place: number, winner: string, given = false) => ({
  end, start: "2026-09-30", place, winner, method: "SPUN" as const, lockedAt: "2026-10-08T12:30:00Z", lockedBy: "1", lockedByName: "Metorrite", entries: wheelNames, entryCount: wheelNames.length,
  hasGif: true, gifSource: "WEBSITE" as const, gifToken: "previewtokenpreviewtoken" + place, linkedUser: place === 2 ? null : "700", linkedUserName: place === 2 ? null : winner + "#1",
  prize: given ? { ...pendingPrize, status: "GIVEN" as const, amount: 5_000_000, paidBy: "55", paidByName: "Metorrite", recipient: "700", recipientName: winner, givenBy: "1", givenByName: "Metorrite", givenAt: "2026-10-09T10:00:00Z", inCoffer: true } : pendingPrize,
});
const wheelWeekOf = (end: string, names: string[]) => ({ end, start: "2026-09-30", winners: names.map((n, i) => wheelWinner(end, i + 1, n, i === 0)), message: "Congrats **" + names.join("** and **") + "**" });
const wheelWeeks = [{ end: "2026-10-14", start: "2026-10-07", winners: [] as string[] }, { end: "2026-10-07", start: "2026-09-30", winners: ["Xtusy", "Hodant"] }, { end: "2026-09-30", start: "2026-09-23", winners: [] as string[] }];
const wheelWeek = { locked: null as null, end: "2026-10-14", start: "2026-10-07", from: "", to: "", cappers: wheelNames, leftOut: [{ name: "Telnos", reason: "clan rank Admin" }], merged: [], weeks: wheelWeeks };
const wheelActions = {
  saveSettings: async () => ({ ok: false as const, error: "Preview only", problems: [] }),
  post: async () => ({ ok: false as const, error: "Preview only", problems: [] }),
  lock: async (end: string, winner: string) => ({ ok: true as const, data: wheelWeekOf(end, [winner]), picture: "website" as const }),
  recordPast: async (end: string, names: string[]) => ({ ok: true as const, data: wheelWeekOf(end, names) }),
  unlock: async () => ({ ok: true as const, data: [wheelWeekOf("2026-10-07", ["Xtusy", "Hodant"])] }),
  week: async (end: string) => ({ ok: true as const, data: wheelWeekOf(end, ["Xtusy", "Hodant"]) }),
  postLocked: async () => ({ ok: false as const, error: "Preview only", problems: [] }),
  markPrize: async (end: string) => ({ ok: true as const, data: wheelWeekOf(end, ["Xtusy", "Hodant"]) }),
  recordPrize: async (end: string) => ({ ok: true as const, data: wheelWeekOf(end, ["Xtusy", "Hodant"]) }),
  holders: async () => ({ ok: true as const, data: [{ userId: "55", name: "Metorrite", balance: 120_000_000 }, { userId: "56", name: "KinkyAstroid", balance: 2_500_000 }] }),
};
const evCatalog = { bosses: [
  { name: "Nex", image: "/bosses/nex.png", items: [{ name: "Torva full helm", key: "torva_full_helm", rarity: "1/200", icon: true }, { name: "Torva boots", key: "torva_boots", rarity: "1/100", icon: true }, { name: "Virtus wand", key: "virtus_wand", rarity: "1/180", icon: true }] },
  { name: "Kalphite King", image: "/bosses/kalphite_king.png", items: [{ name: "Drygore mace", key: "drygore_mace", rarity: "1/500", icon: true }, { name: "Drygore rapier", key: "drygore_rapier", rarity: "1/500", icon: true }] },
] };
const evCall = async (_m: string, path: string) => (path === "events/bingo-catalog" ? { ok: true as const, data: evCatalog } : { ok: false as const, error: "Preview only", problems: [] });
const giveaways = { maxWinners: 50, maxPrize: 200, giveaways: [
  { id: "1", prize: "Rune pouch", status: "OPEN" as const, channelId: "2", channelName: "general", winnerCount: 2, endsAt: "2026-10-12T18:00:00Z", entries: 14, requiredRoleId: "r1", winnerRoleId: "r2", dmWinners: true, reactionEntry: true, winners: [] },
  { id: "2", prize: "50m coins", status: "ENDED" as const, channelId: "2", channelName: "general", winnerCount: 1, endsAt: "2026-10-09T18:00:00Z", entries: 31, requiredRoleId: null, winnerRoleId: null, dmWinners: false, reactionEntry: false, winners: ["5"] },
] };
const serverReminders = {
  maxText: 1000, maxActive: 20, minEveryMinutes: 60, maxEveryMinutes: 86400,
  reminders: [
    { id: "1", channelId: "2", channelName: "general", text: "Weekly cap party starts in an hour at the Citadel!", roleId: "r1", roleName: "Members", everyMinutes: 10080, nextAt: "2026-10-21T17:00:00Z", status: "ACTIVE" as const, createdByName: "Metorrite", lastSentAt: "2026-10-14T17:00:00Z", sendCount: 3, error: null },
    { id: "2", channelId: "2", channelName: "general", text: "Clan meeting tonight.", roleId: null, roleName: null, everyMinutes: null, nextAt: "2026-10-25T18:00:00Z", status: "ACTIVE" as const, createdByName: "PvmRyan", lastSentAt: null, sendCount: 0, error: null },
    { id: "3", channelId: "9", channelName: null, text: "Old reminder", roleId: null, roleName: null, everyMinutes: 1440, nextAt: "2026-10-10T18:00:00Z", status: "FAILED" as const, createdByName: "Metorrite", lastSentAt: null, sendCount: 0, error: "The channel no longer exists." },
  ],
};
const lockdown = {
  channelIds: ["1", "2"], keepTalkingRoleIds: ["r1"], maxChannels: 50, maxRoles: 10,
  locks: [
    { channelId: "2", channelName: "general", lockedBy: "Metorrite", lockedAt: "2026-10-19T09:00:00Z", reason: "Raid in progress", lockdown: true, canUnlock: true },
    { channelId: "9", channelName: null, lockedBy: "PvmRyan", lockedAt: "2026-10-18T20:00:00Z", reason: "", lockdown: false, canUnlock: false },
  ],
};
const suggestions = { channelId: "2", maxNote: 500, suggestions: [
  { id: "3", authorId: "5", authorName: "PvmRyan", content: "Add a weekly boss of the week event with a prize for the most kills.", status: "PENDING" as const, note: null, decidedBy: null, ups: 12, downs: 2, createdAt: "2026-10-10T12:00:00Z" },
  { id: "2", authorId: "6", authorName: null, content: "More voice channels", status: "APPROVED" as const, note: "Done, thanks!", decidedBy: "1", ups: 30, downs: 1, createdAt: "2026-10-08T12:00:00Z" },
] };
const autoclean = { minAge: 60, maxAge: 18720, maxRules: 25, rules: [
  { channelId: "2", channelName: "general", maxAgeMinutes: 1440, keepPinned: true, problem: null },
  { channelId: "1", channelName: "link-requests", maxAgeMinutes: 180, keepPinned: false, problem: "JonnyBot needs the View Channel, Read Message History and Manage Messages permissions in #link-requests to clean it." },
] };
const warnings = { limit: 100, warnings: [
  { id: "9", userId: "5", userName: "PvmRyan", moderatorId: "1", moderatorName: "Drake", reason: "Spamming links in general chat", createdAt: "2026-10-10T12:00:00Z" },
  { id: "8", userId: "6", userName: null, moderatorId: "1", moderatorName: "Drake", reason: "Rude to a new member", createdAt: "2026-10-09T12:00:00Z" },
] };
const autopunish = { maxRules: 5, maxThreshold: 20, maxTimeoutMinutes: 40320, canTimeout: true, canKick: false, canBan: true, rules: [{ threshold: 3, action: "TIMEOUT" as const, timeoutMinutes: 1440 }, { threshold: 5, action: "KICK" as const, timeoutMinutes: 0 }] };
const autodelete = { maxRules: 25, maxDelaySeconds: 300, maxWords: 20, minWordLength: 3, maxRoles: 10, available: [{ key: "INVITES", label: "Discord invites" }, { key: "LINKS", label: "Links" }, { key: "ATTACHMENTS", label: "Files and images" }, { key: "TEXT", label: "Certain words" }], rules: [{ channelId: "2", channelName: "general", filters: ["INVITES", "LINKS", "TEXT"], words: ["free nitro"], roleMode: "EXCEPT_WITH" as const, roleIds: ["r1"], delaySeconds: 30, problem: null }, { channelId: "1", channelName: "link-requests", filters: ["ATTACHMENTS"], words: [], roleMode: "EVERYONE" as const, roleIds: [], delaySeconds: 0, problem: "JonnyBot needs the View Channel and Manage Messages permissions in #link-requests." }] };
const clanprofile = { visibility: "UNLISTED" as const, slug: "younglings", displayName: "Younglings", tagline: "A friendly PvM clan for everyone", description: "We run weekly raids and casual PvM hours.", logoUrl: null, colour: 0xd4af37, timezone: "America/New_York", focus: ["PVM", "SOCIAL"], recruiting: "OPEN" as const, requirements: "Combat 100+, active on Discord", applyUrl: "https://discord.gg/example", leaderboardOptIn: false, currentClanName: "Younglings", verified: false, verifiedClanName: null, listing: "UNLISTED" as const, suspended: false, suspendedReason: null, memberCount: 66, suggestedName: "Younglings", options: { visibility: [{ key: "PRIVATE", label: "Private" }, { key: "UNLISTED", label: "Unlisted" }, { key: "PUBLIC", label: "Public" }], recruiting: [{ key: "CLOSED", label: "Not recruiting" }, { key: "OPEN", label: "Recruiting" }, { key: "INVITE_ONLY", label: "Invite only" }], focus: [{ key: "PVM", label: "PvM" }, { key: "SKILLING", label: "Skilling" }, { key: "SOCIAL", label: "Social" }, { key: "EVENTS", label: "Events" }, { key: "COMPETITIVE", label: "Competitive" }, { key: "CASUAL", label: "Casual" }, { key: "IRONMAN", label: "Ironman" }, { key: "NEW_PLAYERS", label: "New player friendly" }] }, limits: { name: 40, tagline: 120, description: 1500, requirements: 600 } };
const listings = { canEdit: true, listings: [{ guildId: "1", serverName: "Younglings", slug: "younglings", displayName: "Younglings", visibility: "PUBLIC", listing: "LISTED" as const, verified: true, suspended: false, suspendedReason: null, openReports: 1 }, { guildId: "2", serverName: "Spam Clan", slug: "spam", displayName: "Spam Clan", visibility: "PRIVATE", listing: "HIDDEN" as const, verified: false, suspended: true, suspendedReason: "Impersonating another clan", openReports: 0 }], reports: [{ id: "5", guildId: "1", slug: "younglings", displayName: "Younglings", reason: "This clan is using another clan's name and logo.", reporter: "someone", createdAt: "2026-10-11T09:00:00Z" }] };
const clanevents = { listing: "UNLISTED" as const, slug: "younglings", events: [{ id: "1", name: "Weekly Raids", location: "Voice: Raids", status: "SCHEDULED", startTime: "2026-10-13T00:00:00Z", endTime: null, shared: true, scope: "PUBLIC" as const }, { id: "2", name: "Friday Movie Night", location: "Voice: Lounge", status: "SCHEDULED", startTime: "2026-10-16T01:00:00Z", endTime: null, shared: false, scope: "NONE" as const }] };
const modlog = { enabled: true, channelId: "2", logBans: true, logTimeouts: false, canReadAuditLog: false };
const gate = { enabled: true, minAgeDays: 7, action: "KICK" as const, alertChannelId: "2", maxAgeDays: 90, canKick: false, canBan: true, nameRulesEnabled: true, nameAction: "ALERT" as const, nameRules: ["free*nitro", "*scam*"], exemptUserIds: ["123456789012345678"], maxNameRules: 50, maxExempt: 50, minNameRuleChars: 3 };

function TeamsPreview() {
  const [detail, setDetail] = useState(initialTeamsDetail);
  const server = useRef(detail);
  const [call] = useState(() => makeTeamsCall(() => server.current, (d) => { server.current = d; }));
  return <TeamBuilder detail={detail} call={call as never} onDetail={(d) => { server.current = d; setDetail(d); }} />;
}

function ChannelsPreview({ scenario }: { scenario: string }) {
  const [call] = useState(() => makeSpaceCall(scenario));
  return <ChannelsTab detail={spaceDetail} call={call as never} structure={structure} onDetail={() => {}} />;
}

function Preview() {
  const params = useSearchParams();
  const view = params.get("v") ?? "overview";
  const modeParam = params.get("mode");
  // ?mode=advanced|basic sets the Basic / Advanced view of every page before it is looked at (for screenshots)
  useEffect(() => {
    if (modeParam !== "advanced" && modeParam !== "basic") return;
    window.localStorage.setItem("jonnybot-dashboard-view", modeParam);
    window.dispatchEvent(new Event("jonnybot-dashboard-view-changed"));
  }, [modeParam]);
  // ?expand=N opens the first N folded cards (command cards and CollapsibleCards), for screenshots
  const expand = Number(params.get("expand") ?? 0);
  useEffect(() => {
    if (!expand) return;
    const t = setTimeout(() => document.querySelectorAll<HTMLElement>("section.rounded-lg > button[aria-expanded=false], section.rounded-xl > div > button[aria-expanded=false]").forEach((b, i) => { if (i < expand) b.click(); }), 2500);
    return () => clearTimeout(t);
  }, [expand, view]);
  const scenarioParam = useSearchParams().get("s") ?? "solo";
  return (
    <div className="flex min-h-[calc(100vh-4.1rem)] flex-col lg:flex-row">
        <Sidebar server={{ id: "1", name: "Younglings", iconUrl: null, role: "Admin" }} base="/dev-preview" canStar={false} favorites={["/event-manager", "/tickets"]} footer="JonnyBot dashboard · Beta. Signed in as metorrite." />
        <div className="min-w-0 flex-1 space-y-6 px-4 py-6 sm:px-8 lg:px-10">
          {view === "events" && <EventListView structure={previewStructure} kinds={previewKinds} drafts={previewDrafts} templates={previewTemplates} initial={{ events: [{ ...evSummary, players: 7, waiting: 2, proofWaiting: 0, config: { ...evSummary.config, signupClosesAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString() } }, { ...evSummary, id: "8", name: "Sunday Competition", status: "RUNNING" as const, scoringMode: "INDIVIDUAL" as const, scope: "ALLIANCE" as const, players: 11, waiting: 0, proofWaiting: 3 }, { ...evSummary, id: "7", name: "Spring Raids Draft", status: "DRAFT" as const, players: 0, waiting: 0, proofWaiting: 0 }], maxOpen: 20 }} guildId="1" call={setupCall} />}
          {view === "teams" && <TeamsPreview />}
          {view === "channels" && <ChannelsPreview key={scenarioParam} scenario={scenarioParam} />}
          {view === "wizard" && <EventWizard key={wizardKind()} guildId="1" initial={draftOf(wizardKind(), withSlots(schemas[wizardKind()] as OptionSchema).standard) as never} schema={withSlots(schemas[wizardKind()] as OptionSchema)} structure={previewStructure} call={setupCall} />}
          {view === "myevents" && <MyEventsPanel data={myEvents} />}
          {view === "wheel" && <CitadelWheel initial={wheelWeek} weeks={[wheelWeekOf("2026-10-07", ["Xtusy", "Hodant"])]} settings={{ autoPost: false, channelId: null, message: "Well done {mention}!", defaultMessage: "Well done {mention}!", maxLength: 1500 }} structure={{ channels: [], roles: [], forums: [], threads: [] } as never} load={async (end) => ({ ok: true as const, data: (end === "2026-10-07" ? { ...wheelWeek, end, start: "2026-09-30", locked: wheelWeekOf(end, ["Xtusy", "Hodant"]) } : { ...wheelWeek, end, start: "2026-09-30" }) as never })} actions={wheelActions} />}
          {view === "shape" && <EventManager initial={shapeDetail as never} initialClaims={evClaims as never} initialStandings={evStandings} initialAwards={evAwards} call={evCall} />}
          {view === "event" && <EventManager initial={evDetail as never} initialClaims={evClaims as never} initialStandings={evStandings} initialAwards={evAwards} call={evCall} />}
          {view === "overview" && <OverviewView base="/dev-preview" overview={overview} setup={setup} rows={rows} />}
          {view === "commands" && (
            <>
              <PageHeader title="Commands" description="The slash commands members can use in this server." />
              <HubEditor hub={hub} structure={structure} canEditAccess save={async (_k, d) => ({ ok: true, data: { ...hub.commands[0], ...d, afk: undefined } })} />
            </>
          )}
          {view === "permissions" && (
            <>
              <PageHeader title="Roles & permissions" description="Who can do what." />
              <PermissionGroupsEditor initial={perms} roles={structure.roles} canEdit save={async () => ({ ok: true, data: perms })} />
            </>
          )}
          {view === "autoroles" && (
            <>
              <PageHeader title="Autoroles" description="Roles JonnyBot gives to everyone who joins." />
              <AutorolesForm
                initial={{ enabled: true, delaySeconds: 60, memberRoleIds: ["r1"], botRoleIds: [], memberRemoveRoleIds: ["r2"], botRemoveRoleIds: [], maxRoles: 10, maxDelaySeconds: 3600, issues: ["People: a chosen role was deleted, so it is skipped."] }}
                roles={structure.roles}
                save={async () => ({ ok: false, error: "x", problems: [] })}
              />
            </>
          )}
          {view === "rolepanel" && (
            <>
              <PageHeader title="Team roles" description="Change the message or its buttons." />
              <RolePanelEditor
                initial={{ id: "1", name: "Team roles", title: "Pick your team", description: "Press a button to join a team.", color: 0x5865f2, mode: "UNIQUE", posted: true, channelId: "2", messageId: "9", buttons: [{ roleId: "r1", label: "", emoji: "🔥", style: "danger" }, { roleId: "r2", label: "Guests", emoji: null, style: "secondary" }] }}
                structure={structure}
                maxButtons={20}
                actions={{ save: async () => ({ ok: false, error: "x", problems: [] }), remove: async () => ({ ok: false, error: "x", problems: [] }), post: async () => ({ ok: false, error: "x", problems: [] }), listPath: "/", panelBase: "/" }}
              />
            </>
          )}
          {view === "starboard" && (<><PageHeader title="Starboard" description="Copy the best messages to a showcase channel." /><StarboardForm initial={{ enabled: true, channelId: "2", emoji: "⭐", threshold: 3, selfStar: false, maxThreshold: 15, channelThresholds: [], skipHiddenChannels: false, onlyChannels: [], maxChannelRules: 25 }} structure={structure} save={nope as never} /></>)}
          {view === "starboard-custom" && (<><PageHeader title="Starboard" description="With an emoji of its own and self-starring on (they stay visible)." /><StarboardForm initial={{ enabled: true, channelId: "2", emoji: "<:gz:1234>", threshold: 5, selfStar: true, maxThreshold: 15, channelThresholds: [{ channelId: "1", threshold: 8 }], skipHiddenChannels: true, onlyChannels: ["2"], maxChannelRules: 25 }} structure={structure} save={nope as never} /></>)}
          {view === "points" && (<><PageHeader title="Points" description="A points ledger for your server." /><PointsManager initial={pointsOverview as never} submissions={pointsSubmissions as never} structure={structure} rewards={pointsRewards as never} redemptions={pointsRedemptions as never} actions={{ saveSettings: nope as never, award: nope as never, decide: nope as never, saveReward: nope as never, handleRedemption: nope as never }} /></>)}
          {view === "points-new" && (<><PageHeader title="Points" description="A server that has not switched points on yet." /><PointsManager initial={{ ...pointsOverview, enabled: false, reviewChannelId: null, top: [], recent: [], totals: { members: 0, outstanding: 0, awarded: 0, spent: 0 } } as never} submissions={{ pending: [], decided: [] } as never} structure={structure} rewards={{ rewards: [] } as never} redemptions={{ pending: [], handled: [] } as never} actions={{ saveSettings: nope as never, award: nope as never, decide: nope as never, saveReward: nope as never, handleRedemption: nope as never }} /></>)}
          {view === "giveaways" && (<><PageHeader title="Giveaways" description="Run a giveaway with an Enter button and a timed draw." /><GiveawaysManager initial={giveaways} structure={structure} roles={structure.roles} actions={{ start: nope, end: nope, reroll: nope, remove: nope }} /></>)}
          {view === "server-reminders" && (<><PageHeader title="Server reminders" description="Reminders JonnyBot posts in a channel for everyone." /><ServerRemindersManager initial={serverReminders} structure={structure} roles={structure.roles} actions={{ create: nope, cancel: nope }} /></>)}
          {view === "lockdown" && (<><PageHeader title="Lockdown" description="Stop everyone but chosen roles from talking in a channel or a saved set." /><LockdownManager initial={lockdown} structure={structure} canEdit actions={{ save: nope, lock: nope, unlock: nope, start: nope, end: nope }} /></>)}
          {view === "suggestions" && (<><PageHeader title="Suggestions" description="Members post ideas with /suggest." /><SuggestionsManager initial={suggestions} structure={structure} actions={{ saveChannel: nope, decide: nope, remove: nope }} /></>)}
          {view === "autoclean" && (<><PageHeader title="Auto-clean" description="Channels that tidy themselves." /><AutoCleanManager initial={autoclean} structure={structure} actions={{ save: nope, remove: nope }} /></>)}
          {view === "autodelete" && (<><PageHeader title="Auto-delete" description="Keep a channel free of invites." /><AutoDeleteManager initial={autodelete} structure={structure} roles={structure.roles} actions={{ save: nope, remove: nope }} /></>)}
          {view === "clanprofile" && (<><PageHeader title="Clan profile" description="How your clan appears to others." /><ClanProfileForm initial={clanprofile} moderationHref="#" actions={{ save: nope, verify: nope }} /></>)}
          {view === "listings" && (<><PageHeader title="Directory moderation" description="Reports and listings." /><ListingsModerator initial={listings} actions={{ suspend: nope, restore: nope, resolve: nope }} /></>)}
          {view === "events" && (<><PageHeader title="Public events" description="Choose which events are public." /><PublicEventsManager initial={clanevents} profileHref="#" actions={{ setScope: nope }} /></>)}
          {view === "warnings" && (<><PageHeader title="Warnings" description="The record of warnings given with /warn." /><WarningsManager initial={warnings} actions={{ remove: nope }} /><AutopunishEditor initial={autopunish} actions={{ save: nope }} /></>)}
          {view === "automod" && (<><PageHeader title="Automod" description="Deletes messages that break the rules you switch on." /><AutomodForm initial={automod as never} structure={structure} save={nope as never} /></>)}
          {view === "automod-set" && (<><PageHeader title="Automod" description="With the capitals rule on, a warning on spam and an exempt role (they stay visible in Basic)." /><AutomodForm initial={{ ...automod, exemptRoles: ["r2"], rules: automod.rules.map((r) => (r.key === "CAPS" ? { ...r, enabled: true } : r.key === "SPAM" ? { ...r, warn: true } : r)) } as never} structure={structure} save={nope as never} /></>)}
          {view === "post" && (<><PageHeader title="Post a message" description="Write a message and have JonnyBot post it in any channel." /><PostTool channels={structure.channels} post={(async () => ({ ok: true, data: { warnings: [] } })) as never} /></>)}
          {view === "scheduled" && (<><PageHeader title="Scheduled posts" description="Write an announcement now and have JonnyBot post it later." /><ScheduledPosts initial={scheduledPosts as never} channels={structure.channels} actions={{ schedule: nope as never, cancel: nope as never }} /></>)}
          {view === "warnings-none" && (<><PageHeader title="Warnings" description="A server that has no Autopunish rules." /><WarningsManager initial={warnings as never} actions={{ remove: nope as never }} /><AutopunishEditor initial={{ ...autopunish, rules: [] } as never} actions={{ save: nope as never }} /></>)}
          {view === "modlog-default" && (<><PageHeader title="Moderation log" description="Both bans and timeouts are logged." /><ModLogForm initial={{ ...modlog, logTimeouts: true } as never} structure={structure} save={nope as never} /></>)}
          {view === "newaccounts-default" && (<><PageHeader title="New accounts" description="Alert only, a usual age." /><AccountGateForm initial={{ ...gate, action: "ALERT" } as never} structure={structure} save={nope as never} /></>)}
          {view === "modlog" && (<><PageHeader title="Moderation log" description="Bans, unbans and timeouts." /><ModLogForm initial={modlog} structure={structure} save={nope} /></>)}
          {view === "newaccounts" && (<><PageHeader title="New accounts" description="Be told when a young account joins." /><AccountGateForm initial={gate} structure={structure} save={nope} /></>)}
          {view === "welcome" && (
            <>
              <PageHeader title="Welcome message" description="Greets each new member in a channel, as text, an embed, or both." />
              <WelcomeEditor
                initial={welcomeFull}
                channels={structure.channels}
                actions={{ save: async (d) => ({ ok: true, data: { ...welcomeFull, ...d } as WelcomeConfig }) as WelcomeActionResult<WelcomeConfig>, test: async () => ({ ok: true, data: { sent: true, channelName: "welcome", dmSent: false } }) }}
              />
            </>
          )}
          {view === "welcome-new" && (
            <>
              <PageHeader title="Welcome message" description="A server that has not set a welcome up yet." />
              <WelcomeEditor initial={welcomeEmpty} channels={structure.channels} actions={{ save: async () => ({ ok: false, error: "x", problems: [] }), test: async () => ({ ok: false, error: "x", problems: [] }) }} />
            </>
          )}
          {view === "snapshots" && (
            <>
              <PageHeader title="Snapshots" description="Bundles the bot's state at this moment into a zip with an id. Put the id in a bug report. Secrets are removed." />
              <SnapshotsManager
                guildId="1"
                keepDays={14}
                initial={[
                  { id: "snap-20261018-143005-a3f9", guildId: "1", createdAt: "2026-10-18T14:30:05Z", sizeBytes: 48_213, requestedBy: "2", focus: "event:12" },
                  { id: "snap-20261017-091500-04be", guildId: "1", createdAt: "2026-10-17T09:15:00Z", sizeBytes: 2_345_678, requestedBy: "2", focus: "" },
                ]}
                take={async (focus) => ({ ok: true as const, data: { snapshot: { id: "snap-20261018-150000-c0de", guildId: "1", createdAt: new Date().toISOString(), sizeBytes: 51_200, requestedBy: "2", focus } } })}
                remove={async (id) => ({ ok: true as const, data: { deleted: id } })}
              />
            </>
          )}
          {view === "goodbye" && (
            <>
              <PageHeader title="Goodbye message" description="A line posted in a channel when someone leaves the server." />
              <GoodbyeForm initial={{ enabled: true, channelId: "2", content: "**{username}** has left **{server}**. We are {count} now.", maxContent: 1800, serverName: "Younglings", memberCount: 182 }} structure={structure} save={async () => ({ ok: false, error: "x", problems: [] })} />
            </>
          )}
          {view === "rolepanels" && (
            <>
              <PageHeader title="Role panels" description="A message of buttons members press to pick their own roles." />
              <RolePanelCards base="/dev-preview" panels={[
                { id: "1", name: "Team roles", title: "Pick your team", mode: "UNIQUE", buttonCount: 4, posted: true, channelId: "2", channelName: "general" },
                { id: "2", name: "Ping roles", title: "", mode: "TOGGLE", buttonCount: 6, posted: false, channelId: null, channelName: null },
                { id: "3", name: "Interests", title: "What do you play?", mode: "TOGGLE", buttonCount: 9, posted: true, channelId: "2", channelName: "general" },
              ]} />
            </>
          )}
          {view === "rolepanel-new" && (
            <>
              <PageHeader title="New role panel" description="Write the message, add a button for each role, then create it." />
              <RolePanelEditor
                initial={{ id: null, name: "", title: "", description: "", color: null, mode: "TOGGLE", posted: false, channelId: null, messageId: null, buttons: [{ roleId: "", label: "", emoji: null, style: "primary" }] }}
                structure={structure}
                maxButtons={20}
                actions={{ save: async () => ({ ok: false, error: "x", problems: [] }), remove: async () => ({ ok: false, error: "x", problems: [] }), post: async () => ({ ok: false, error: "x", problems: [] }), listPath: "/", panelBase: "/" }}
              />
            </>
          )}
          {view === "tracking" && (<><PageHeader title="Activity announcements" description="Where JonnyBot announces your clan's activity." /><TrackingEditor groups={trackingGroups} channels={structure.channels} save={async () => ({ ok: true, data: undefined })} /></>)}
          {view === "tracking-admin" && (<><PageHeader title="Activity announcements" description="With a Discord admin log feed already posting." /><TrackingEditor groups={trackingGroups.map((g) => (g.key === "MESSAGES" ? { ...g, enabled: true, channels: [{ channelId: "2", name: "general" }] } : g))} channels={structure.channels} save={async () => ({ ok: true, data: undefined })} /></>)}
          {view === "autoreplies" && (<><PageHeader title="Automatic replies" description="Teach JonnyBot to answer messages on its own." /><AutoRepliesEditor initial={autoReplies as never} actions={{ save: nope as never, remove: nope as never }} /></>)}
          {view === "community" && (<><PageHeader title="Polls & signups" description="Where member polls are posted." /><CommunitySettingsForm pollChannelId="2" channels={structure.channels} save={(async () => ({ ok: true, data: undefined })) as never} /></>)}
          {view === "tickets" && (<><PageHeader title="Tickets" description="Private help channels members open from a panel." /><div className="space-y-6"><TicketTabs guildId="1" /><TicketsOverview guildId="1" panels={ticketPanels} stats={ticketStats} channels={structure.channels} /></div></>)}
          {view === "tickethistory" && (<><PageHeader title="Tickets" description="Private help channels members open from a panel." /><div className="space-y-6"><TicketTabs guildId="1" /><TicketHistoryList guildId="1" status="ALL" panel="" page={0} tickets={ticketRows as never} hasMore panels={ticketPanels} /></div></>)}
          {view === "ticketsettings" && (<><PageHeader title="Tickets" description="Private help channels members open from a panel." /><div className="space-y-6"><TicketTabs guildId="1" /><SettingsForm initial={ticketSettings} structure={structure} save={(async () => ({ ok: true, data: ticketSettings })) as never} /></div></>)}
          {view === "ticketdefaults" && (<><PageHeader title="Tickets" description="Private help channels members open from a panel." /><div className="space-y-6"><TicketTabs guildId="1" /><PanelDefaultsForm initial={panelDefaults as never} structure={structure} save={(async () => ({ ok: true, data: panelDefaults })) as never} /></div></>)}
          {view === "ticketpanel" && (<><PageHeader title="Tickets" description="Private help channels members open from a panel." /><div className="space-y-6"><TicketTabs guildId="1" /><PanelEditor initial={ticketPanel as never} structure={structure} where={{ save: nope as never, remove: nope as never, post: nope as never, listPath: "/", panelBase: "/", pvmHelpPath: null }} /></div></>)}
          {view === "guide" && (<><PageHeader title="Guided setup" description="A step-by-step run through the parts of JonnyBot." /><GuideCards guildId="1" /></>)}
          {view === "setupwizard" && (<><PageHeader title="Guided setup" description="A step-by-step run through the parts of JonnyBot." /><SetupWizard guildId="1" guildName="Younglings" initialPath={null} data={{ structure, setup, permissions: perms as never, tracking: trackingGroups, welcome: welcomeFull, hub: hub as never, isAdmin: true }} quick={{ permissions: nope as never, clan: nope as never, tracking: nope as never, welcome: nope as never, commands: nope as never }} full={{ setup: nope as never, permissions: nope as never, tracking: nope as never, welcome: nope as never, welcomeTest: nope as never, welcomeUploadUrl: "/x", welcomeRemoveImage: nope as never, hub: nope as never }} /></>)}
          {view === "setupwizard-quick" && (<><PageHeader title="Guided setup" description="Quick setup, the first steps." /><SetupWizard guildId="1" guildName="Younglings" initialPath="quick" data={{ structure, setup, permissions: perms as never, tracking: trackingGroups, welcome: welcomeFull, hub: hub as never, isAdmin: true }} quick={{ permissions: nope as never, clan: nope as never, tracking: nope as never, welcome: nope as never, commands: nope as never }} full={{ setup: nope as never, permissions: nope as never, tracking: nope as never, welcome: nope as never, welcomeTest: nope as never, welcomeUploadUrl: "/x", welcomeRemoveImage: nope as never, hub: nope as never }} /></>)}
          {view === "setup" && (
            <>
              <PageHeader title="Server setup" description="The basics JonnyBot needs to work in this server." />
              <ServerSetupForm initial={setup} structure={structure} save={async (s) => ({ ok: true, data: s })} />
            </>
          )}
        </div>
    </div>
  );
}

export default function DevPreview() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}
