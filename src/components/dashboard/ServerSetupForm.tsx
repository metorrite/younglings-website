"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { ChannelSelect, RoleSelect } from "@/components/admin/pickers";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { choicesOf, type GuildStructure, type ServerSetup, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/**
 * A server's basic setup: its clan, where link requests are reviewed, and the roles verification hands out. Who counts as
 * staff is on the Roles & permissions page. The same settings as `/configure` in Discord, which is where a freshly installed server has to start.
 * Everything is checked by the bot before anything is saved, so a refused save changes nothing and says why.
 */
export function ServerSetupForm({
  initial,
  structure,
  save,
}: {
  initial: ServerSetup;
  structure: GuildStructure;
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

  const channelName = (id: string | null) => structure.channels.find((c) => c.id === id)?.name;
  const rolesSet = [setup.verifiedClanRoleId, setup.verifiedNonClanRoleId, setup.unverifiedRoleId, setup.onboardingRoleId].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <CollapsibleCard
        id="setup-clan"
        title="Your clan"
        hint="Which RuneScape clan this server is for. Leave it empty if it isn't a clan server."
        defaultOpen
        summary={
          <>
            {setup.clanName ? <Chip>{setup.clanName}</Chip> : <Chip tone="warn">No clan set</Chip>}
            {setup.clanName && <Chip tone={setup.clanEnabled ? "good" : "bad"}>{setup.clanEnabled ? "On" : "Off"}</Chip>}
          </>
        }
        info={
          <>
            <p>JonnyBot tracks the clan&apos;s members, announces their drops, quests and kills, and gives members and guests their roles.</p>
            <p>To set or change the clan you must be an Admin (or higher) of that clan in game, with your RuneScape name linked to your Discord account. If you haven&apos;t linked it yet, run /rs in the server first.</p>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <FormField label="RuneScape clan name" hint="Exactly as it appears in game.">
            <input className={inputClass} value={clanDraft} maxLength={30} onChange={(e) => { setClanDraft(e.target.value); setOutcome(null); }} />
          </FormField>
          <div className="self-end pb-1">
            <Toggle
              checked={setup.clanEnabled}
              onChange={(on) => change({ clanEnabled: on })}
              label="Clan features"
              detail={setup.clanEnabled ? "On: the clan is tracked and announced." : "Off: the clan is kept but nothing about it is posted."}
              info="Switch this off to pause everything clan-related in this server without losing your settings."
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="setup-links"
        title="Link requests"
        hint="Where staff review members who ask to link a RuneScape name."
        defaultOpen
        summary={
          <>
            <Chip tone={setup.verificationReviewChannelId ? "good" : "warn"}>{setup.verificationReviewChannelId ? `#${channelName(setup.verificationReviewChannelId) ?? "channel"}` : "No review channel"}</Chip>
            {setup.renameAlertChannelId && <Chip>Rename alerts on</Chip>}
          </>
        }
        info="When a member asks to link a RuneScape name, a card with Approve and Reject buttons is posted in the review channel for your staff."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <FormField label="Review channel" info="Where link requests are posted. JonnyBot needs permission to send messages there.">
            <ChannelSelect {...choicesOf(structure)} onlyPostable value={setup.verificationReviewChannelId} onChange={(id) => change({ verificationReviewChannelId: id })} none="No review channel" />
          </FormField>
          <FormField label="Rename alerts" info="Where possible RuneScape name changes are flagged for staff.">
            <ChannelSelect {...choicesOf(structure)} onlyPostable value={setup.renameAlertChannelId} onChange={(id) => change({ renameAlertChannelId: id })} none="No rename alerts" />
          </FormField>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="setup-roles"
        title="Roles JonnyBot hands out"
        hint="Given and taken away automatically as people link names and join or leave the clan."
        defaultOpen
        summary={<Chip tone={rolesSet === 0 ? "warn" : "good"}>{rolesSet === 0 ? "None chosen" : `${rolesSet} of 4 chosen`}</Chip>}
        info="JonnyBot's own role has to sit above each of these in Server Settings, then Roles, or Discord won't let it hand them out."
      >
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-4">
          <FormField label="Verified clan member" info="Linked, and in your clan.">
            <RoleSelect roles={giveable} value={setup.verifiedClanRoleId} onChange={(id) => change({ verifiedClanRoleId: id })} none="No role" />
          </FormField>
          <FormField label="Verified, not in the clan" info="Linked, but not (or no longer) in your clan.">
            <RoleSelect roles={giveable} value={setup.verifiedNonClanRoleId} onChange={(id) => change({ verifiedNonClanRoleId: id })} none="No role" />
          </FormField>
          <FormField label="Not verified" info="People who haven't linked a name.">
            <RoleSelect roles={giveable} value={setup.unverifiedRoleId} onChange={(id) => change({ unverifiedRoleId: id })} none="No role" />
          </FormField>
          <FormField label="Link request pending" info="Given when someone asks to link a name, until staff decide.">
            <RoleSelect roles={giveable} value={setup.onboardingRoleId} onChange={(id) => change({ onboardingRoleId: id })} none="No role" />
          </FormField>
        </div>
      </CollapsibleCard>

      <SaveBar pending={pending} onSave={submit} outcome={outcome} />
    </div>
  );
}
