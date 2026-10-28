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
import { andList } from "@/components/dashboard/ui/andList";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { colorToHex, hexToColor } from "@/lib/welcomePreview";
import {
  choicesOf,
  discordColorCss,
  type GuildRole,
  type GuildStructure,
  type RolePanelButton,
  type RolePanelDef,
  type RolePanelList,
  type RolePanelRule,
  type RolePanelStyle,
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
    panel: Omit<RolePanelDef, "id" | "posted" | "channelId" | "messageId" | "attached">,
  ) => Promise<WelcomeActionResult<RolePanelDef>>;
  remove: (panelId: string) => Promise<WelcomeActionResult<RolePanelList>>;
  /** Posts the panel in a channel, or (a reactions panel) puts it on an existing message by its link. */
  post: (
    panelId: string,
    target: { channelId?: string; messageLink?: string },
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

/** Discord's limits on what one message can hold; the bot sends the same numbers, these are for when an older bot does not. */
const DEFAULT_LIMITS: Record<RolePanelStyle, number> = {
  BUTTONS: 20,
  DROPDOWN: 25,
  REACTIONS: 20,
};

const STYLES: {
  key: RolePanelStyle;
  label: string;
  item: string;
  hint: string;
}[] = [
  { key: "BUTTONS", label: "Buttons", item: "button", hint: "A row of buttons under the message." },
  { key: "DROPDOWN", label: "Drop-down", item: "option", hint: "One menu to choose from. Good for many roles." },
  { key: "REACTIONS", label: "Reactions", item: "reaction", hint: "Members react with an emoji, like classic reaction roles." },
];

const RULES: { key: RolePanelRule; label: string; hint: string }[] = [
  { key: "NORMAL", label: "Take and drop", hint: "Members can take a role and drop it again." },
  { key: "ADD_ONLY", label: "Only take", hint: "Members can take roles but not drop them, so they stay." },
  { key: "REMOVE_ONLY", label: "Only drop", hint: "Members can only drop roles they already have." },
];

const withDefaults = (p: RolePanelDef): RolePanelDef => ({
  ...p,
  style: p.style ?? "BUTTONS",
  rule: p.rule ?? "NORMAL",
  attached: p.attached ?? false,
});

const blank = (): RolePanelButton => ({
  roleId: "",
  label: "",
  emoji: null,
  style: "primary",
});
const shape = (
  p: Pick<
    RolePanelDef,
    "name" | "title" | "description" | "color" | "mode" | "style" | "rule" | "buttons"
  >,
) =>
  JSON.stringify([p.name, p.title, p.description, p.color, p.mode, p.style ?? "BUTTONS", p.rule ?? "NORMAL", p.buttons]);

/**
 * Makes a message members use to take roles: what it says, how they choose (buttons, a drop-down or emoji reactions), which roles it gives, and where it is posted,
 * with a live preview of how it will look. Whether members may hold one role or any number is a switch at the top of the roles. Basic shows the message, the style,
 * the roles and where to post it; Advanced adds the card colour, the button colours and whether members may only take or only drop roles (all kept visible in Basic
 * once they are saved). A reactions panel can also be put on a message that already exists, by its link.
 */
export function RolePanelEditor({
  initial,
  structure,
  actions,
  maxButtons,
  limits,
}: {
  initial: RolePanelDef;
  structure: GuildStructure;
  actions: RolePanelActions;
  maxButtons: number;
  limits?: Record<RolePanelStyle, number>;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => withDefaults(initial));
  const [panel, setPanel] = useState(() => withDefaults(initial));
  const [channel, setChannel] = useState<string | null>(initial.channelId);
  const [link, setLink] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const roles = structure.roles
    .filter((r) => !r.managed && r.id !== undefined)
    .sort((a, b) => b.position - a.position);
  const roleById = new Map<string, GuildRole>(
    structure.roles.map((r) => [r.id, r]),
  );
  const dirty = shape(panel) !== shape(saved);
  const isNew = saved.id === null;
  const style = panel.style ?? "BUTTONS";
  const rule = panel.rule ?? "NORMAL";
  const styleInfo = STYLES.find((s) => s.key === style)!;
  const max = (limits ?? DEFAULT_LIMITS)[style] ?? maxButtons;

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
    style,
    rule,
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
      setSaved(withDefaults(result.data));
      setPanel(withDefaults(result.data));
      setOutcome({
        tone: "success",
        title: result.data.posted && !result.data.attached
          ? "Saved. Update the posted message below to show the changes."
          : result.data.attached
            ? "Saved. Put the panel on the message again below if you changed the reactions."
            : "Saved.",
      });
    });
  }

  function post(target: { channelId?: string; messageLink?: string }) {
    if (!saved.id) return;
    setOutcome(null);
    start(async () => {
      const result = await actions.post(saved.id!, target);
      if (!result.ok)
        return setOutcome({
          tone: "error",
          title: result.error,
          items: result.problems,
        });
      setSaved(withDefaults(result.data));
      setPanel(withDefaults(result.data));
      setLink("");
      setOutcome({
        tone: "success",
        title: target.messageLink
          ? "Done. The reactions are on that message and members can use them now."
          : "Posted. Members can pick their roles from that message now.",
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
  const showButtonColours = style === "BUTTONS" && (advanced || saved.buttons.some((b) => b.style !== "primary"));
  const showRule = advanced || (saved.rule ?? "NORMAL") !== "NORMAL";
  const hiddenInUse = [
    !showColour && panel.color !== null && "card colour",
    style === "BUTTONS" && !showButtonColours && panel.buttons.some((b) => b.style !== "primary") && "button colours",
    !showRule && rule !== "NORMAL" && "who can take and drop roles",
  ].filter((name): name is string => typeof name === "string");
  const hiddenNames = [
    !showColour && "the card colour",
    style === "BUTTONS" && !showButtonColours && "the button colours",
    !showRule && "whether members can only take or only drop roles",
  ].filter((name): name is string => typeof name === "string");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0 space-y-4">
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
          title={styleInfo.label === "Buttons" ? "Buttons" : styleInfo.label === "Drop-down" ? "Menu options" : "Reactions"}
          hint={`Each ${styleInfo.item} gives one role.`}
          defaultOpen
          summary={
            <>
              <Chip tone={panel.buttons.length === 0 ? "warn" : "good"}>
                {panel.buttons.length === 0
                  ? `No ${styleInfo.item}s yet`
                  : `${panel.buttons.length} ${styleInfo.item}${panel.buttons.length === 1 ? "" : "s"}`}
              </Chip>
              <Chip>{styleInfo.label}</Chip>
              <Chip>{panel.mode === "UNIQUE" ? "Only one" : "Any number"}</Chip>
            </>
          }
          info={`Up to ${max} ${styleInfo.item}s: that is Discord's limit for ${styleInfo.label === "Buttons" ? "a message of buttons" : styleInfo.label === "Drop-down" ? "one menu" : "reactions on one message"}. JonnyBot only gives ordinary roles that sit below its own role and have no powerful permissions (like Administrator or Ban Members), so a panel can't be used to take over the server. Leave a label empty to use the role's name.`}
        >
          <FormField label="How members choose" size="lg" as="group" hint={styleInfo.hint}>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={style === s.key}
                  onClick={() => change({ style: s.key })}
                  className={`rounded-full border px-3 py-1 text-xs transition ${style === s.key ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </FormField>
          {panel.buttons.length > max && (
            <p className="text-sm text-amber-300">
              {styleInfo.label} can offer at most {max} {styleInfo.item}s: remove {panel.buttons.length - max} to save.
            </p>
          )}
          {showRule && (
            <FormField label="Members can" size="lg" as="group" hint={RULES.find((r) => r.key === rule)!.hint}>
              <div className="flex flex-wrap gap-2">
                {RULES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={rule === r.key}
                    onClick={() => change({ rule: r.key })}
                    className={`rounded-full border px-3 py-1 text-xs transition ${rule === r.key ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </FormField>
          )}
          <SettingRow
            title="Only one role at a time"
            hint="Choosing a role swaps out any other role from this panel."
            info="Switched on, the buttons exclude each other, like a team: pressing a new one swaps out the old one (but only roles on this panel are swapped). Off, people can press as many buttons as they like, and pressing one again removes the role."
            checked={panel.mode === "UNIQUE"}
            onChange={(on) => change({ mode: on ? "UNIQUE" : "TOGGLE" })}
            offHint="Off: each button works on its own. Press it to take the role, press it again to drop the role."
          />
          {panel.buttons.length === 0 && (
            <p className="text-sm text-muted">No {styleInfo.item}s yet. Add one below.</p>
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
                    <FormField label={style === "REACTIONS" ? "Emoji (needed)" : "Emoji"} size="sm">
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
            disabled={panel.buttons.length >= max}
            onClick={() => change({ buttons: [...panel.buttons, blank()] })}
          >
            + Add {styleInfo.item === "option" ? "an" : "a"} {styleInfo.item}
          </button>
        </CollapsibleCard>

        {hiddenNames.length > 0 && (
          <MoreInAdvanced>
            {andList(hiddenNames)}.
            {hiddenInUse.length > 0 ? ` Also in use: ${andList(hiddenInUse)}.` : ""}
          </MoreInAdvanced>
        )}

        {!isNew && (
          <CollapsibleCard
            id="rp-post"
            title="Post it"
            hint="Send the message to a channel, or update it where it already is."
            defaultOpen
            summary={
              <Chip tone={saved.posted ? "good" : "plain"}>
                {saved.posted
                  ? saved.attached
                    ? `On a message in #${postedChannel?.name ?? "a channel"}`
                    : `Posted in #${postedChannel?.name ?? "a channel"}`
                  : "Not posted"}
              </Chip>
            }
            info="Save your changes first: posting sends the saved version. If the panel is already posted in the channel you choose, its message is edited in place, so members keep the same message. If someone deleted it, a fresh one is posted. A reactions panel can also be put on a message that already exists: JonnyBot adds its reactions to it and never edits or deletes the message."
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
              onClick={() => post({ channelId: channel! })}
            >
              {saved.posted && !saved.attached && channel === saved.channelId
                ? "Update the posted message"
                : "Post to channel"}
            </button>
            {style === "REACTIONS" && (
              <>
                <FormField
                  label="Or put it on an existing message"
                  size="lg"
                  hint="Paste the message's link (right-click the message, Copy Message Link). JonnyBot adds the reactions to it; the message is never edited or deleted."
                >
                  <input
                    className={inputClass}
                    value={link}
                    placeholder="https://discord.com/channels/…"
                    onChange={(e) => setLink(e.target.value)}
                  />
                </FormField>
                <button
                  type="button"
                  className={ghostButton}
                  disabled={pending || dirty || !link.trim() || saved.buttons.length === 0}
                  onClick={() => post({ messageLink: link })}
                >
                  Add the reactions to that message
                </button>
              </>
            )}
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
                  (panel.title
                    ? ""
                    : style === "DROPDOWN"
                      ? "Choose from the menu to take or drop a role."
                      : style === "REACTIONS"
                        ? "React to take or drop a role."
                        : "Press a button to take or drop a role.")}
              </p>
              {style === "REACTIONS" &&
                panel.buttons.map((b, i) => (
                  <p key={i} className="mt-1 text-sm text-[#dbdee1]">
                    {b.emoji || "❔"}  {b.label || roleById.get(b.roleId)?.name || "Role"}
                  </p>
                ))}
            </div>
            {style === "DROPDOWN" && (
              <div className="mt-2 rounded bg-[#1e1f22] px-3 py-2 text-sm text-[#949ba4]">
                {rule === "REMOVE_ONLY" ? "Choose roles to drop" : panel.mode === "UNIQUE" ? "Choose one" : "Choose your roles"} ▾
                {panel.buttons.slice(0, 3).map((b, i) => (
                  <p key={i} className="mt-1 text-[#dbdee1]">
                    {b.emoji} {b.label || roleById.get(b.roleId)?.name || "Role"}
                  </p>
                ))}
                {panel.buttons.length > 3 && <p className="mt-1 text-xs">and {panel.buttons.length - 3} more…</p>}
              </div>
            )}
            {style === "REACTIONS" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {panel.buttons.map((b, i) => (
                  <span key={i} className="rounded-full bg-[#2b2d31] px-2 py-0.5 text-sm">
                    {b.emoji || "❔"} 1
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {style === "BUTTONS" && panel.buttons.length === 0 && (
                <span className="text-xs text-muted">Buttons appear here.</span>
              )}
              {style === "BUTTONS" && panel.buttons.map((b, i) => {
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
              {rule === "ADD_ONLY" && " They can take roles but not drop them."}
              {rule === "REMOVE_ONLY" && " They can only drop roles they have."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
