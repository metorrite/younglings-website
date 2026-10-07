"use client";

import { useState, useTransition } from "react";
import { postHelpGuidelinesAction, saveHelpSettingsAction } from "@/app/admin/(console)/pvm-help/actions";
import type { GuildStructure, HelpSettings } from "@/lib/jonnybot-admin";
import { ChannelSelect, RoleSelect } from "./pickers";
import { Card, FormField, ghostButton, inputClass, Notice, primaryButton } from "./ui";

const MAX_GUIDELINES = 3500;

/** One audience's ping timing: whether helpers are pinged when the ticket opens, and the wait before the next role up is pinged. */
function PingTimers({
  pingOnOpen,
  hours,
  onPingOnOpen,
  onHours,
}: {
  pingOnOpen: boolean;
  hours: number | null;
  onPingOnOpen: (value: boolean) => void;
  onHours: (value: number | null) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={pingOnOpen} onChange={(e) => onPingOnOpen(e.target.checked)} />
        Ping helpers when the ticket opens
      </label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hours !== null} onChange={(e) => onHours(e.target.checked ? 72 : null)} />
          Ping the next role up if nobody joins
        </label>
        {hours !== null && (
          <FormField label="Hours without a helper">
            <input type="number" min={1} max={720} className={inputClass} value={hours} onChange={(e) => onHours(Number(e.target.value) || 1)} />
          </FormField>
        )}
      </div>
    </div>
  );
}

/**
 * The PvM Help system's settings: the two helper roles, the guidelines members agree to, when member and guest tickets ping helpers, and the
 * earlier-attempts rule for Master and above. These are the same settings as /configure's PvM Help section in Discord.
 */
export function PvmHelpForm({ initial, structure }: { initial: HelpSettings; structure: GuildStructure }) {
  const [settings, setSettings] = useState(initial);
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [postChannel, setPostChannel] = useState<string | null>(initial.postedChannelId);
  // The message's button hands out the saved role, so posting waits for a saved one rather than whatever is picked above.
  const [savedHelperRoleId, setSavedHelperRoleId] = useState(initial.helperRoleId);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof HelpSettings>(key: K, value: HelpSettings[K]) => {
    setNotice(null);
    setSettings((s) => ({ ...s, [key]: value }));
  };

  function save() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await saveHelpSettingsAction(settings);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      setSettings(result.data);
      setSavedHelperRoleId(result.data.helperRoleId);
      setNotice("Saved. If the guidelines message is already posted, it now shows the saved text.");
    });
  }

  function post() {
    if (!postChannel) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await postHelpGuidelinesAction(postChannel);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      setSettings(result.data);
      setNotice("Posted. Members can read the guidelines and take the PVM Helper role from that message.");
    });
  }

  const postedChannel = structure.channels.find((c) => c.id === settings.postedChannelId);

  return (
    <div className="space-y-6">
      <Card title="Helper roles" hint="PVM Helper is handed out when someone agrees to the guidelines. PVM Helper+ is given by hand, so nobody can take it by themselves.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="PVM Helper role">
            <RoleSelect roles={structure.roles} value={settings.helperRoleId} onChange={(id) => set("helperRoleId", id)} none="Not set" />
          </FormField>
          <FormField label="PVM Helper+ role">
            <RoleSelect roles={structure.roles} value={settings.helperPlusRoleId} onChange={(id) => set("helperPlusRoleId", id)} none="Not set" />
          </FormField>
        </div>
      </Card>

      <Card
        title="Helper guidelines"
        hint="What members read, and agree to, before they become a PVM Helper. Until you change it this is the built-in draft."
      >
        <FormField label="Guidelines">
          <textarea
            className={`${inputClass} min-h-96 font-mono text-xs leading-relaxed`}
            value={settings.guidelines}
            maxLength={MAX_GUIDELINES}
            onChange={(e) => set("guidelines", e.target.value)}
          />
        </FormField>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>
            {settings.guidelines.length} / {MAX_GUIDELINES} characters. Discord formatting works: <code>**bold**</code> and • bullets.
          </span>
          <button type="button" className={ghostButton} onClick={() => set("guidelines", settings.defaultGuidelines)} disabled={settings.guidelines === settings.defaultGuidelines}>
            Reset to the built-in draft
          </button>
        </div>
      </Card>

      <Card
        title="Post the guidelines"
        hint={
          settings.postedChannelId ? (
            <>Posted in {postedChannel ? `#${postedChannel.name}` : "a channel"}. Posting to the same channel updates that message in place.</>
          ) : (
            "Not posted yet. Save your changes first: the posted message shows the saved version."
          )
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <FormField label="Channel">
              <ChannelSelect channels={structure.channels} value={postChannel} onChange={setPostChannel} none="Choose a channel…" onlyPostable />
            </FormField>
          </div>
          <button type="button" className={primaryButton} disabled={pending || !postChannel || !savedHelperRoleId} onClick={post}>
            {settings.postedChannelId && settings.postedChannelId === postChannel ? "Update posted message" : "Post message"}
          </button>
        </div>
        {!savedHelperRoleId && <p className="text-xs text-muted">Choose and save the PVM Helper role first. The button on that message hands it out.</p>}
      </Card>

      <Card
        title="Member tickets"
        hint="A member is someone in the clan. Their PvM Help and CA Help tickets ping the helpers who opted in for the tier when they open, and the next role up if nobody joins."
      >
        <PingTimers
          pingOnOpen={settings.memberPingOnOpen}
          hours={settings.memberEscalationHours}
          onPingOnOpen={(v) => set("memberPingOnOpen", v)}
          onHours={(v) => set("memberEscalationHours", v)}
        />
      </Card>

      <Card
        title="Guest tickets"
        hint="A guest is anyone who isn't a clan member, whether or not they have linked a RuneScape name. For now guests' tickets ping nobody; switch this on to change that."
      >
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={settings.guestPingsEnabled} onChange={(e) => set("guestPingsEnabled", e.target.checked)} />
          Guest tickets ping helpers
          <span className="text-xs font-normal text-muted">(currently {settings.guestPingsEnabled ? "on" : "off"})</span>
        </label>
        {settings.guestPingsEnabled ? (
          <PingTimers
            pingOnOpen={settings.guestPingOnOpen}
            hours={settings.guestEscalationHours}
            onPingOnOpen={(v) => set("guestPingOnOpen", v)}
            onHours={(v) => set("guestEscalationHours", v)}
          />
        ) : (
          <p className="text-xs text-muted">The timers below appear once guest pings are on. Guests can still open tickets, and every helper can see them.</p>
        )}
      </Card>

      <Card
        title="Master and above"
        hint="Hard and below need nothing extra. On a CA Help panel, a guest asking for one of these tiers has to say what they have already tried. Members and PvM Help tickets are never asked."
      >
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.guestHighTierNeedsAttempts} onChange={(e) => set("guestHighTierNeedsAttempts", e.target.checked)} />
          Guests must describe earlier attempts
        </label>
        <FormField label="Tier names that count" hint="Comma separated, matched against the tier choices on your CA Help panel.">
          <input className={inputClass} value={settings.highTierLabels} maxLength={200} onChange={(e) => set("highTierLabels", e.target.value)} />
        </FormField>
      </Card>

      {error && <Notice tone="error" title={error.message} items={error.problems} />}
      {notice && <Notice tone="success" title={notice} />}

      <button type="button" className={primaryButton} disabled={pending} onClick={save}>
        {pending ? "Working…" : "Save settings"}
      </button>
    </div>
  );
}
