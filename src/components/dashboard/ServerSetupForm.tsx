"use client";

import { useState, useTransition } from "react";
import { Card, FormField, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import type { GuildStructure, ServerSetup, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/**
 * A server's basic setup: its clan, who counts as staff, where link requests are reviewed, and the roles verification
 * hands out. The same settings as `/configure` in Discord, which is where a freshly installed server has to start.
 * Everything is checked by the bot before anything is saved, so a refused save changes nothing and says why.
 */
export function ServerSetupForm({
  initial,
  structure,
  canEditStaff,
  save,
}: {
  initial: ServerSetup;
  structure: GuildStructure;
  /** Only the Admin tier may change who counts as staff; the Developer tier sees the choices but can't edit them. */
  canEditStaff: boolean;
  save: (setup: ServerSetup) => Promise<WelcomeActionResult<ServerSetup>>;
}) {
  const [setup, setSetup] = useState<ServerSetup>(initial);
  const [clanDraft, setClanDraft] = useState(initial.clanName ?? "");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();

  const change = (patch: Partial<ServerSetup>) => {
    setSetup((current) => ({ ...current, ...patch }));
    setOutcome(null);
  };
  // roles the bot gives out can't be ones an integration owns
  const giveable = structure.roles.filter((role) => !role.managed);
  const postable = structure.channels.filter((channel) => channel.canPost);

  function submit() {
    setOutcome(null);
    start(async () => {
      const trimmed = clanDraft.trim();
      const result = await save({ ...setup, clanName: trimmed === "" ? null : trimmed });
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setSetup(result.data);
      setClanDraft(result.data.clanName ?? "");
      setOutcome({ tone: "success", title: "Saved." });
    });
  }

  return (
    <div className="space-y-6">
      <Card
        title="Your clan"
        hint="Tell JonnyBot which RuneScape clan this server is for. It tracks the clan's members, announces their drops, quests and kills, and gives members and guests their roles. Leave it empty if this isn't a clan server."
      >
        <FormField label="RuneScape clan name" hint="Exactly as it appears in game.">
          <input className={inputClass} value={clanDraft} maxLength={30} onChange={(e) => { setClanDraft(e.target.value); setOutcome(null); }} />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={setup.clanEnabled} onChange={(e) => change({ clanEnabled: e.target.checked })} />
          Clan features switched on
        </label>
        <p className="text-xs text-muted">
          To set or change the clan you must be an Admin (or higher) of that clan in game, with your RuneScape name linked to your Discord account. If you
          haven&apos;t linked it yet, run <code className="rounded bg-white/10 px-1">/rs</code> in the server first.
        </p>
      </Card>

      <Card
        title="Staff roles"
        hint={canEditStaff ? "Who may use JonnyBot's admin tools and this dashboard. Anyone with Administrator or Manage Server permission always can." : "Only an Admin can change these."}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Admin role" hint="Full access to the dashboard and the admin tools.">
            <RoleSelect roles={structure.roles} value={setup.adminRoleId} onChange={(id) => change({ adminRoleId: id })} none="No Admin role" disabled={!canEditStaff} />
          </FormField>
          <FormField label="Developer role" hint="The dashboard, but not the staff roles.">
            <RoleSelect roles={structure.roles} value={setup.developerRoleId} onChange={(id) => change({ developerRoleId: id })} none="No Developer role" disabled={!canEditStaff} />
          </FormField>
          <FormField label="Support role" hint="Ticket staff.">
            <RoleSelect roles={structure.roles} value={setup.supportRoleId} onChange={(id) => change({ supportRoleId: id })} none="No Support role" disabled={!canEditStaff} />
          </FormField>
        </div>
      </Card>

      <Card title="Link requests" hint="When a member asks to link a RuneScape name, a card with Approve and Reject buttons is posted for your staff.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Review channel" hint="Where link requests are posted. JonnyBot needs permission to send messages there.">
            <ChannelSelect channels={postable} value={setup.verificationReviewChannelId} onChange={(id) => change({ verificationReviewChannelId: id })} none="No review channel" />
          </FormField>
          <FormField label="Rename alerts" hint="Where possible RuneScape name changes are flagged for staff.">
            <ChannelSelect channels={postable} value={setup.renameAlertChannelId} onChange={(id) => change({ renameAlertChannelId: id })} none="No rename alerts" />
          </FormField>
        </div>
      </Card>

      <Card
        title="Roles JonnyBot hands out"
        hint="Given and taken away automatically as people link their names and join or leave the clan. JonnyBot's own role has to sit above each of these in Server Settings, Roles."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Verified clan member" hint="Linked, and in your clan.">
            <RoleSelect roles={giveable} value={setup.verifiedClanRoleId} onChange={(id) => change({ verifiedClanRoleId: id })} none="No role" />
          </FormField>
          <FormField label="Verified, not in the clan" hint="Linked, but not (or no longer) in your clan.">
            <RoleSelect roles={giveable} value={setup.verifiedNonClanRoleId} onChange={(id) => change({ verifiedNonClanRoleId: id })} none="No role" />
          </FormField>
          <FormField label="Not verified" hint="People who haven't linked a name.">
            <RoleSelect roles={giveable} value={setup.unverifiedRoleId} onChange={(id) => change({ unverifiedRoleId: id })} none="No role" />
          </FormField>
          <FormField label="Link request pending" hint="Given when someone asks to link a name, until staff decide.">
            <RoleSelect roles={giveable} value={setup.onboardingRoleId} onChange={(id) => change({ onboardingRoleId: id })} none="No role" />
          </FormField>
        </div>
      </Card>

      {outcome && <Notice tone={outcome.tone} title={outcome.title} items={outcome.items} />}
      <button type="button" className={primaryButton} disabled={pending} onClick={submit}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
