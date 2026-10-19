"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { ChannelListPicker, RolePicker } from "@/components/dashboard/pickers";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { choicesOf, type Automod, type AutomodRule, type GuildStructure, type WelcomeActionResult } from "@/lib/jonnybot-admin";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

const HINTS: Record<AutomodRule["key"], string> = {
  INVITES: "Deletes messages with a Discord server invite link.",
  LINKS: "Deletes messages with a link to a website that isn't on your allowed list. Invites have their own rule.",
  BLOCKED_WORDS: "Deletes messages containing a word from your list. Whole words only, so blocking “ass” doesn't catch “class”.",
  CAPS: "Deletes messages written mostly in capitals.",
  MENTIONS: "Deletes messages that mention too many people, roles or @everyone.",
  SPAM: "Deletes messages from someone sending too many in a short time.",
  REPEAT: "Deletes a message that is sent again and again.",
  EMOJI: "Deletes messages with too many emoji.",
};

const shape = (d: Pick<Automod, "enabled" | "rules" | "exemptRoles" | "exemptChannels">) =>
  JSON.stringify([d.enabled, d.rules.map((r) => [r.key, r.enabled, r.warn, r.limit, r.seconds, r.words]), d.exemptRoles, d.exemptChannels]);

/** The rules that few servers use: capitals, repeated messages and emoji. */
const ADVANCED_RULES: AutomodRule["key"][] = ["CAPS", "REPEAT", "EMOJI"];

/**
 * Switches automod on, configures each rule, and chooses who is never checked. Basic is the switch and the usual rules (invites, links, blocked words, spam,
 * mentions) with their numbers; Advanced adds the capitals, repeated message and emoji rules, giving the writer a warning, and the roles and channels that are
 * never checked. A rule that is already on, a warning already switched on, and exemptions already saved stay visible in Basic.
 */
export function AutomodForm({
  initial,
  structure,
  save,
}: {
  initial: Automod;
  structure: GuildStructure;
  save: (draft: Pick<Automod, "enabled" | "rules" | "exemptRoles" | "exemptChannels">) => Promise<WelcomeActionResult<Automod>>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = shape(draft) !== shape(saved);
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const savedRule = (key: AutomodRule["key"]) => saved.rules.find((r) => r.key === key);
  const showRule = (r: AutomodRule) => advanced || !ADVANCED_RULES.includes(r.key) || savedRule(r.key)?.enabled === true;
  const showWarn = (r: AutomodRule) => advanced || savedRule(r.key)?.warn === true;
  const showExempt = advanced || saved.exemptRoles.length > 0 || saved.exemptChannels.length > 0;
  const hiddenRules = draft.rules.filter((r) => !showRule(r)).map((r) => r.label.toLowerCase());
  const hidden = [
    hiddenRules.length > 0 && `the ${andList(hiddenRules)} rules`,
    !advanced && "warning the writer",
    !showExempt && "roles and channels that are never checked",
  ].filter((name): name is string => typeof name === "string");

  const patch = (p: Partial<Automod>) => {
    setDraft((d) => ({ ...d, ...p }));
    setOutcome(null);
  };
  const patchRule = (key: AutomodRule["key"], p: Partial<AutomodRule>) => patch({ rules: draft.rules.map((r) => (r.key === key ? { ...r, ...p } : r)) });
  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save({ enabled: draft.enabled, rules: draft.rules, exemptRoles: draft.exemptRoles, exemptChannels: draft.exemptChannels });
      if (!result.ok) return setOutcome({ tone: "error", title: result.error, items: result.problems });
      setSaved(result.data);
      setDraft(result.data);
      setOutcome({ tone: "success", title: draft.enabled ? "Saved. Automod is on." : "Saved. Automod is switched off." });
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      <CollapsibleCard
        id="automod-main"
        title="Automod"
        hint="The master switch."
        defaultOpen
        summary={
          <>
            <Chip tone={draft.enabled ? "good" : "bad"}>{draft.enabled ? "On" : "Off"}</Chip>
            <Chip>{draft.rules.filter((r) => r.enabled).length} rules on</Chip>
          </>
        }
        info="Nothing is checked until this is on. JonnyBot needs the Manage Messages permission to delete messages."
      >
        <SettingRow
          title="Use automod in this server"
          hint={draft.enabled ? "Messages are checked against the rules below." : "Nothing is checked."}
          checked={draft.enabled}
          onChange={(on) => patch({ enabled: on })}
          offHint="Off: nothing is checked. Your rules are kept."
        />
        {!draft.canDelete && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            JonnyBot doesn&apos;t have the Manage Messages permission, so it can&apos;t delete anything. Give it that permission in Discord&apos;s server settings.
          </p>
        )}
      </CollapsibleCard>

      <PanelGrid min="24rem">
        {draft.rules.filter(showRule).map((r) => (
          <CollapsibleCard
            key={r.key}
            id={`automod-${r.key}`}
            title={r.label}
            hint={HINTS[r.key]}
            summary={
              <>
                <Chip tone={r.enabled ? "good" : "plain"}>{r.enabled ? "On" : "Off"}</Chip>
                {r.enabled && r.warn && <Chip tone="warn">Warns</Chip>}
              </>
            }
          >
            <Toggle checked={r.enabled} onChange={(on) => patchRule(r.key, { enabled: on })} label={`Check for ${r.label.toLowerCase()}`} />
            {showWarn(r) && (
              <Toggle checked={r.warn} onChange={(on) => patchRule(r.key, { warn: on })} label="Also give the writer a warning" detail="Counts toward Autopunish, so repeat offenders can be timed out, kicked or banned automatically." disabled={!r.enabled} />
            )}

            {r.key === "CAPS" && (
              <FieldGrid>
                <FormField label="Percentage of capitals" size="sm" hint="40 to 100.">
                  <input className={inputClass} inputMode="numeric" value={r.limit} onChange={(e) => patchRule(r.key, { limit: num(e.target.value) })} />
                </FormField>
                <FormField label="Least letters before it counts" size="sm" hint="So “OK” and “LOL” are fine.">
                  <input className={inputClass} inputMode="numeric" value={r.seconds} onChange={(e) => patchRule(r.key, { seconds: num(e.target.value) })} />
                </FormField>
              </FieldGrid>
            )}
            {r.key === "MENTIONS" && (
              <FormField label="Most mentions allowed in one message" size="sm" hint="People, roles and @everyone each count.">
                <input className={inputClass} inputMode="numeric" value={r.limit} onChange={(e) => patchRule(r.key, { limit: num(e.target.value) })} />
              </FormField>
            )}
            {r.key === "EMOJI" && (
              <FormField label="Most emoji allowed in one message" size="sm">
                <input className={inputClass} inputMode="numeric" value={r.limit} onChange={(e) => patchRule(r.key, { limit: num(e.target.value) })} />
              </FormField>
            )}
            {(r.key === "SPAM" || r.key === "REPEAT") && (
              <FieldGrid>
                <FormField label={r.key === "SPAM" ? "Messages" : "Identical messages"} size="sm" hint={r.key === "SPAM" ? "At or above this many…" : "At or above this many of the same message…"}>
                  <input className={inputClass} inputMode="numeric" value={r.limit} onChange={(e) => patchRule(r.key, { limit: num(e.target.value) })} />
                </FormField>
                <FormField label="Within (seconds)" size="sm">
                  <input className={inputClass} inputMode="numeric" value={r.seconds} onChange={(e) => patchRule(r.key, { seconds: num(e.target.value) })} />
                </FormField>
              </FieldGrid>
            )}
            {(r.key === "BLOCKED_WORDS" || r.key === "LINKS") && (
              <FormField
                label={r.key === "BLOCKED_WORDS" ? "Blocked words" : "Allowed websites"}
                size="lg"
                hint={r.key === "BLOCKED_WORDS" ? `One per line or separated by commas. Up to ${draft.maxWords}.` : `Websites whose links are fine, like youtube.com (subdomains count too). One per line. Up to ${draft.maxDomains}.`}
              >
                <textarea
                  className={`${inputClass} min-h-28`}
                  value={r.words.join("\n")}
                  placeholder={r.key === "BLOCKED_WORDS" ? "word one\nword two" : "runescape.com\nyoutube.com"}
                  onChange={(e) => patchRule(r.key, { words: e.target.value.split(/[\n,]/).map((w) => w.trim()).filter((w) => w.length > 0) })}
                />
              </FormField>
            )}
          </CollapsibleCard>
        ))}

        {showExempt && (
          <CollapsibleCard
            id="automod-exempt"
            title="Never checked"
            hint="Roles and channels automod leaves alone."
            summary={
              <>
                <Chip>{draft.exemptRoles.length} roles</Chip>
                <Chip>{draft.exemptChannels.length} channels</Chip>
              </>
            }
            info="Bots, webhooks, administrators and anyone who can manage messages in a channel are never checked either."
          >
            <FormField label="Exempt roles" as="group" size="lg">
              <RolePicker roles={structure.roles} value={draft.exemptRoles} max={25} disabled={pending} onChange={(ids) => patch({ exemptRoles: ids })} />
            </FormField>
            <FormField label="Exempt channels" as="group" size="lg">
              <ChannelListPicker {...choicesOf(structure)} value={draft.exemptChannels} max={25} disabled={pending} empty="No channel is exempt." allowForums={false} onChange={(ids) => patch({ exemptChannels: ids })} />
            </FormField>
          </CollapsibleCard>
        )}
      </PanelGrid>

      {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}

      <SaveBar
        pending={pending}
        onSave={submit}
        outcome={outcome}
        dirty={dirty}
        onDiscard={() => {
          setDraft(saved);
          setOutcome(null);
        }}
      />
    </div>
  );
}
