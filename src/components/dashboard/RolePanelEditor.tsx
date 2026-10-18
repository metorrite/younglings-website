"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import {
  dangerButton,
  FormField,
  ghostButton,
  inputClass,
  primaryButton,
} from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { useViewMode, ViewModeBar } from "@/components/dashboard/ui/ViewMode";
import { colorToHex, hexToColor } from "@/lib/welcomePreview";
import {
  choicesOf,
  discordColorCss,
  type GuildRole,
  type GuildStructure,
  type RolePanelButton,
  type RolePanelDef,
  type RolePanelList,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

type Outcome = {
  tone: "error" | "success";
  title: string;
  items?: string[];
} | null;

export interface RolePanelActions {
  save: (
    panelId: string | null,
    panel: Omit<RolePanelDef, "id" | "posted" | "channelId" | "messageId">,
  ) => Promise<WelcomeActionResult<RolePanelDef>>;
  remove: (panelId: string) => Promise<WelcomeActionResult<RolePanelList>>;
  post: (
    panelId: string,
    channelId: string,
  ) => Promise<WelcomeActionResult<RolePanelDef>>;
  /** Where the list of panels is, and where one panel is, so the editor can move on after creating or deleting one. */
  listPath: string;
  /** Where one panel is, without its id: a panel is at `${panelBase}/${id}`. A string so a server page can pass it. */
  panelBase: string;
}

const STYLE: Record<RolePanelButton["style"], { label: string; css: string }> =
  {
    primary: { label: "Blue", css: "#5865f2" },
    secondary: { label: "Grey", css: "#4e5058" },
    success: { label: "Green", css: "#248046" },
    danger: { label: "Red", css: "#da373c" },
  };

const blank = (): RolePanelButton => ({
  roleId: "",
  label: "",
  emoji: null,
  style: "primary",
});
const shape = (
  p: Pick<
    RolePanelDef,
    "name" | "title" | "description" | "color" | "mode" | "buttons"
  >,
) =>
  JSON.stringify([p.name, p.title, p.description, p.color, p.mode, p.buttons]);

/**
 * Makes a message of role buttons: what it says, which roles its buttons give, and where it is posted, with a live preview of how it will look. Whether members
 * may hold one role or any number is a switch at the top of the buttons. Basic shows the message, the buttons and where to post it; Advanced adds the card colour
 * and the button colours (kept visible in Basic once they are saved).
 */
export function RolePanelEditor({
  initial,
  structure,
  actions,
  maxButtons,
}: {
  initial: RolePanelDef;
  structure: GuildStructure;
  actions: RolePanelActions;
  maxButtons: number;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [panel, setPanel] = useState(initial);
  const [channel, setChannel] = useState<string | null>(initial.channelId);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const [mode, setMode] = useViewMode("role-panel");
  const advanced = mode === "advanced";
  const roles = structure.roles
    .filter((r) => !r.managed && r.id !== undefined)
    .sort((a, b) => b.position - a.position);
  const roleById = new Map<string, GuildRole>(
    structure.roles.map((r) => [r.id, r]),
  );
  const dirty = shape(panel) !== shape(saved);
  const isNew = saved.id === null;

  const change = (patch: Partial<RolePanelDef>) => {
    setPanel((p) => ({ ...p, ...patch }));
    setOutcome(null);
  };
  const changeButton = (i: number, patch: Partial<RolePanelButton>) =>
    change({
      buttons: panel.buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)),
    });
  const move = (i: number, by: number) => {
    const buttons = [...panel.buttons];
    const [moved] = buttons.splice(i, 1);
    buttons.splice(i + by, 0, moved);
    change({ buttons });
  };

  const body = () => ({
    name: panel.name,
    title: panel.title,
    description: panel.description,
    color: panel.color,
    mode: panel.mode,
    buttons: panel.buttons,
  });

  function save() {
    setOutcome(null);
    start(async () => {
      const result = await actions.save(saved.id, body());
      if (!result.ok)
        return setOutcome({
          tone: "error",
          title: result.error,
          items: result.problems,
        });
      if (isNew) return router.push(`${actions.panelBase}/${result.data.id!}`);
      setSaved(result.data);
      setPanel(result.data);
      setOutcome({
        tone: "success",
        title: result.data.posted
          ? "Saved. Update the posted message below to show the changes."
          : "Saved.",
      });
    });
  }

  function post() {
    if (!saved.id || !channel) return;
    setOutcome(null);
    start(async () => {
      const result = await actions.post(saved.id!, channel);
      if (!result.ok)
        return setOutcome({
          tone: "error",
          title: result.error,
          items: result.problems,
        });
      setSaved(result.data);
      setPanel(result.data);
      setOutcome({
        tone: "success",
        title: "Posted. Members can pick their roles from that message now.",
      });
    });
  }

  async function remove() {
    if (
      !saved.id ||
      !(await confirmDialog({ title: `Delete the panel "${saved.name}"?`, body: "If it is posted, its message is taken down too.", confirmLabel: "Delete panel", tone: "danger" }))
    )
      return;
    start(async () => {
      const result = await actions.remove(saved.id!);
      if (!result.ok)
        return setOutcome({
          tone: "error",
          title: result.error,
          items: result.problems,
        });
      router.push(actions.listPath);
    });
  }

  const color = panel.color === null ? "#1e1f22" : colorToHex(panel.color);
  const postedChannel = structure.channels.find(
    (c) => c.id === saved.channelId,
  );

  // Basic keeps what most panels need; whatever is already saved stays on screen, so nothing set is ever out of sight.
  const showColour = advanced || saved.color !== null;
  const showButtonColours = advanced || saved.buttons.some((b) => b.style !== "primary");
  const hiddenInUse = [
    !showColour && panel.color !== null && "card colour",
    !showButtonColours && panel.buttons.some((b) => b.style !== "primary") && "button colours",
  ].filter((name): name is string => typeof name === "string");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0 space-y-4">
        <ViewModeBar mode={mode} onChange={setMode}>
          {advanced
            ? "Showing everything, including the card colour and the button colours."
            : `Showing what most panels need. ${hiddenInUse.length > 0 ? `Also in use, and shown in Advanced: ${hiddenInUse.join(", ")}.` : "Switch to Advanced for colours."}`}
        </ViewModeBar>

        <CollapsibleCard
          id="rp-message"
          title="The message"
          hint="What members see above the buttons."
          defaultOpen
          summary={
            <Chip tone={panel.name.trim() ? "plain" : "warn"}>
              {panel.name.trim() || "Needs a name"}
            </Chip>
          }
          info="The name is only for you, to tell your panels apart. The title and description are what members read. Leave both empty for a plain 'press a button' message."
        >
          <FieldGrid>
            <FormField
              label="Name"
              size="md"
              hint="For your own reference. Members don't see it."
            >
              <input
                className={inputClass}
                value={panel.name}
                maxLength={60}
                placeholder="Team roles"
                onChange={(e) => change({ name: e.target.value })}
              />
            </FormField>
            <FormField label="Title" size="md">
              <input
                className={inputClass}
                value={panel.title}
                maxLength={256}
                placeholder="Pick your team"
                onChange={(e) => change({ title: e.target.value })}
              />
            </FormField>
            {showColour && (
              <FormField label="Colour" size="md" as="group">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    aria-label="Card colour"
                    className="h-9 w-14 cursor-pointer rounded border border-surface-border bg-background p-1"
                    value={panel.color === null ? "#5865f2" : colorToHex(panel.color)}
                    onChange={(e) => change({ color: hexToColor(e.target.value) })}
                  />
                  {panel.color !== null && (
                    <button
                      type="button"
                      className={ghostButton}
                      onClick={() => change({ color: null })}
                    >
                      No colour
                    </button>
                  )}
                </div>
              </FormField>
            )}
          </FieldGrid>
          <FormField label="Description" size="lg">
            <textarea
              className={`${inputClass} min-h-24`}
              rows={3}
              value={panel.description}
              maxLength={4000}
              placeholder="Press a button to join a team. Press it again to leave."
              onChange={(e) => change({ description: e.target.value })}
            />
          </FormField>
        </CollapsibleCard>

        <CollapsibleCard
          id="rp-buttons"
          title="Buttons"
          hint="Each button gives one role."
          defaultOpen
          summary={
            <>
              <Chip tone={panel.buttons.length === 0 ? "warn" : "good"}>
                {panel.buttons.length === 0
                  ? "No buttons yet"
                  : `${panel.buttons.length} button${panel.buttons.length === 1 ? "" : "s"}`}
              </Chip>
              <Chip>{panel.mode === "UNIQUE" ? "Only one" : "Any number"}</Chip>
            </>
          }
          info={`Up to ${maxButtons} buttons. JonnyBot only gives ordinary roles that sit below its own role and have no powerful permissions (like Administrator or Ban Members), so a panel can't be used to take over the server. Leave a label empty to use the role's name.`}
        >
          <SettingRow
            title="Only one role at a time"
            hint="Choosing a role swaps out any other role from this panel."
            info="Switched on, the buttons exclude each other, like a team: pressing a new one swaps out the old one (but only roles on this panel are swapped). Off, people can press as many buttons as they like, and pressing one again removes the role."
            checked={panel.mode === "UNIQUE"}
            onChange={(on) => change({ mode: on ? "UNIQUE" : "TOGGLE" })}
            offHint="Off: each button works on its own. Press it to take the role, press it again to drop the role."
          />
          {panel.buttons.length === 0 && (
            <p className="text-sm text-muted">No buttons yet. Add one below.</p>
          )}
          <PanelGrid min="18rem" max="18rem" gap="gap-3">
            {panel.buttons.map((b, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-surface-border bg-background/40 p-4"
              >
                <FormField label="Role" size="md">
                  <select
                    className={inputClass}
                    value={b.roleId}
                    onChange={(e) => changeButton(i, { roleId: e.target.value })}
                  >
                    <option value="">Choose a role…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <div className="min-w-0 flex-1 basis-32">
                    <FormField
                      label="Label"
                      size="md"
                      hint={
                        b.roleId && roleById.get(b.roleId)
                          ? `Empty shows “${roleById.get(b.roleId)!.name}”.`
                          : undefined
                      }
                    >
                      <input
                        className={inputClass}
                        value={b.label}
                        maxLength={80}
                        placeholder="Button text"
                        onChange={(e) => changeButton(i, { label: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div className="w-20">
                    <FormField label="Emoji" size="sm">
                      <input
                        className={inputClass}
                        value={b.emoji ?? ""}
                        maxLength={64}
                        placeholder="🔥"
                        onChange={(e) =>
                          changeButton(i, { emoji: e.target.value || null })
                        }
                      />
                    </FormField>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {showButtonColours && (
                    <div
                      className="flex items-center gap-1.5"
                      role="group"
                      aria-label="Button colour"
                    >
                      {(Object.keys(STYLE) as RolePanelButton["style"][]).map(
                        (style) => (
                          <button
                            key={style}
                            type="button"
                            aria-pressed={b.style === style}
                            title={STYLE[style].label}
                            onClick={() => changeButton(i, { style })}
                            className={`h-6 w-6 rounded-full border-2 transition ${b.style === style ? "border-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                            style={{ backgroundColor: STYLE[style].css }}
                          >
                            <span className="sr-only">{STYLE[style].label}</span>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                  <div className="ml-auto flex gap-1.5">
                    <button
                      type="button"
                      className={ghostButton}
                      disabled={i === 0}
                      aria-label="Move up"
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={ghostButton}
                      disabled={i === panel.buttons.length - 1}
                      aria-label="Move down"
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={dangerButton}
                      onClick={() =>
                        change({
                          buttons: panel.buttons.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </PanelGrid>
          <button
            type="button"
            className={ghostButton}
            disabled={panel.buttons.length >= maxButtons}
            onClick={() => change({ buttons: [...panel.buttons, blank()] })}
          >
            + Add a button
          </button>
        </CollapsibleCard>

        {!isNew && (
          <CollapsibleCard
            id="rp-post"
            title="Post it"
            hint="Send the message to a channel, or update it where it already is."
            defaultOpen
            summary={
              <Chip tone={saved.posted ? "good" : "plain"}>
                {saved.posted
                  ? `Posted in #${postedChannel?.name ?? "a channel"}`
                  : "Not posted"}
              </Chip>
            }
            info="Save your changes first: posting sends the saved version. If the panel is already posted in the channel you choose, its message is edited in place, so members keep the same message. If someone deleted it, a fresh one is posted."
          >
            {dirty && (
              <p className="text-sm text-gold">
                You have unsaved changes. Save first, so the posted message
                matches what you see.
              </p>
            )}
            <FormField label="Channel" size="md" as="group">
              <ChannelSelect
                {...choicesOf(structure)}
                onlyPostable
                allowForums={false}
                value={channel}
                onChange={setChannel}
                none="Choose a channel…"
              />
            </FormField>
            <button
              type="button"
              className={primaryButton}
              disabled={
                pending || dirty || !channel || saved.buttons.length === 0
              }
              onClick={post}
            >
              {saved.posted && channel === saved.channelId
                ? "Update the posted message"
                : "Post to channel"}
            </button>
          </CollapsibleCard>
        )}

        {!isNew && (
          <div className="flex justify-end">
            <button
              type="button"
              className={dangerButton}
              disabled={pending}
              onClick={remove}
            >
              Delete this panel
            </button>
          </div>
        )}

        <SaveBar
          pending={pending}
          onSave={save}
          outcome={outcome}
          label={isNew ? "Create panel" : "Save changes"}
          dirty={dirty}
          onDiscard={
            isNew
              ? undefined
              : () => {
                  setPanel(saved);
                  setOutcome(null);
                }
          }
        >
          {isNew
            ? "Name it and add at least one button, then create it."
            : undefined}
        </SaveBar>
      </div>

      <div className="min-w-0">
        <div className="xl:sticky xl:top-4">
          <section className="rounded-xl border border-surface-border bg-surface p-5">
            <h2 className="font-semibold text-gold">Preview</h2>
            <p className="mt-1 text-xs text-muted">
              Roughly how it will look in Discord.
            </p>
            <div
              className="mt-3 overflow-hidden rounded border-l-4 bg-[#2b2d31] p-3"
              style={{ borderLeftColor: color }}
            >
              {panel.title && (
                <p className="font-semibold text-white">{panel.title}</p>
              )}
              <p className="mt-1 text-sm whitespace-pre-wrap text-[#dbdee1]">
                {panel.description ||
                  (panel.title ? "" : "Press a button to take or drop a role.")}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {panel.buttons.length === 0 && (
                <span className="text-xs text-muted">Buttons appear here.</span>
              )}
              {panel.buttons.map((b, i) => {
                const role = roleById.get(b.roleId);
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white"
                    style={{ backgroundColor: STYLE[b.style].css }}
                  >
                    {b.emoji && <span>{b.emoji}</span>}
                    {b.label || role?.name || "Role"}
                    {role && role.color !== 0 && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: discordColorCss(role.color) }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">
              {panel.mode === "UNIQUE"
                ? "Members can hold only one of these roles."
                : "Members can hold any of these roles."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
