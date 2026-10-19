"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePanelAction, postPanelAction, savePanelAction } from "@/app/admin/(console)/tickets/actions";
import { choicesOf } from "@/lib/jonnybot-admin";
import type { FieldKind, FieldPurpose, GuildStructure, HelpKind, PanelDefinition, PanelField, PanelOption } from "@/lib/jonnybot-admin";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { FieldGrid, PanelGrid, Span } from "@/components/dashboard/ui/Layout";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { CategorySelect, ChannelSelect, RoleMultiSelect, RoleSelect } from "./pickers";
import { ClosingFields, MessageFields } from "./TicketSharedFields";
import { dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "./ui";

const MAX_FIELDS = 5; // Discord forms hold at most 5 inputs
const MAX_OPTIONS = 25;

type EditorOption = PanelOption & { uid: number };
type EditorField = Omit<PanelField, "options"> & { uid: number; options: EditorOption[] };
type EditorPanel = Omit<PanelDefinition, "fields"> & { fields: EditorField[] };

const KIND_LABELS: Record<FieldKind, string> = {
  SHORT: "Short answer",
  PARAGRAPH: "Long answer",
  SELECT: "Dropdown",
  CHECKBOX: "Yes / no checkbox",
};

const HELP_KIND_LABELS: Record<HelpKind, string> = {
  NONE: "Ordinary ticket",
  PVM: "PvM Help",
  CA: "CA Help",
};

const PURPOSE_LABELS: Record<FieldPurpose, string> = {
  NONE: "Nothing special",
  BOSS: "The boss (chosen from a list)",
  TIER: "The tier they pick",
  ACHIEVEMENT: "A specific achievement (chosen from a list)",
  ATTEMPTS: "Whether they have made attempts",
};

/** Which parts of the help rules a question of this kind can stand for. */
function purposesFor(kind: FieldKind): FieldPurpose[] {
  if (kind === "SELECT") return ["TIER"];
  if (kind === "CHECKBOX") return ["ATTEMPTS"];
  return ["BOSS", "ACHIEVEMENT", "ATTEMPTS"];
}

/** Keys for list rows, so editing or reordering a question doesn't scramble the inputs React keeps for it. */
let uidCounter = 0;
const nextUid = () => ++uidCounter;

/** Where the editor's saves go and where it sends people afterwards: the clan console's by default, a server's on the bot dashboard. */
export interface PanelEditorWhere {
  save: typeof savePanelAction;
  remove: typeof deletePanelAction;
  post: typeof postPanelAction;
  /** The ticket panels list. */
  listPath: string;
  /** Where one panel's page is, without its id: a panel is at `${panelBase}/${id}`. A string, not a function, so a server page can pass it. */
  panelBase: string;
  /** The PvM Help rules page, or null where there isn't one. */
  pvmHelpPath: string | null;
}

const CONSOLE: PanelEditorWhere = {
  save: savePanelAction,
  remove: deletePanelAction,
  post: postPanelAction,
  listPath: "/admin/tickets",
  panelBase: "/admin/tickets/panels",
  pvmHelpPath: "/admin/pvm-help",
};

/**
 * One ticket panel: the message, its channels, who handles tickets, the form and where it is posted. Basic is what a panel needs to work (name, title, the
 * category, the staff and helper roles, the questions); Advanced adds the help type, the channel name and limit, helpers joining and escalation, who can close,
 * the ticket wording and the per-question and per-choice detail. Anything already saved stays visible in Basic.
 */
export function PanelEditor({ initial, structure, where = CONSOLE }: { initial: PanelDefinition; structure: GuildStructure; where?: PanelEditorWhere }) {
  const router = useRouter();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const [saved, setSaved] = useState(initial);
  const [panel, setPanel] = useState<EditorPanel>(() => ({
    ...initial,
    fields: initial.fields.map((f) => ({ ...f, uid: nextUid(), options: f.options.map((o) => ({ ...o, uid: nextUid() })) })),
  }));
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [postChannel, setPostChannel] = useState<string | null>(initial.postedChannelId ?? null);

  const isNew = saved.id === undefined;
  const roles = structure.roles;

  const set = <K extends keyof EditorPanel>(key: K, value: EditorPanel[K]) => setPanel((p) => ({ ...p, [key]: value }));
  const setField = (uid: number, change: Partial<EditorField>) =>
    setPanel((p) => ({ ...p, fields: p.fields.map((f) => (f.uid === uid ? { ...f, ...change } : f)) }));
  const setOption = (fieldUid: number, optionUid: number, change: Partial<EditorOption>) =>
    setPanel((p) => ({
      ...p,
      fields: p.fields.map((f) =>
        f.uid === fieldUid ? { ...f, options: f.options.map((o) => (o.uid === optionUid ? { ...o, ...change } : o)) } : f,
      ),
    }));

  const addField = () =>
    setPanel((p) => ({
      ...p,
      fields: [...p.fields, { uid: nextUid(), label: "", kind: "SHORT", required: true, placeholder: null, maxLength: null, purpose: "NONE", options: [] }],
    }));
  const moveField = (index: number, by: -1 | 1) =>
    setPanel((p) => {
      const target = index + by;
      if (target < 0 || target >= p.fields.length) return p;
      const fields = [...p.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...p, fields };
    });

  function save() {
    setError(null);
    setNotice(null);
    const payload: PanelDefinition = {
      ...panel,
      fields: panel.fields.map((field) => ({
        label: field.label,
        kind: field.kind,
        required: field.required,
        placeholder: field.placeholder,
        maxLength: field.maxLength,
        purpose: field.purpose,
        options: field.options.map((option) => ({ label: option.label, pingRoleId: option.pingRoleId, escalateRoleId: option.escalateRoleId })),
      })),
    };
    startTransition(async () => {
      const result = await where.save(saved.id ?? null, payload);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      if (isNew) {
        router.push(`${where.panelBase}/${result.data.id!}`);
        return;
      }
      setSaved(result.data);
      setNotice("Saved. If this panel is already posted, its message has been updated.");
      router.refresh();
    });
  }

  async function remove() {
    if (!saved.id || !(await confirmDialog({ title: `Delete the panel "${saved.name}"?`, body: "Closed tickets and transcripts are kept.", confirmLabel: "Delete panel", tone: "danger" }))) return;
    setError(null);
    startTransition(async () => {
      const result = await where.remove(saved.id!);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      router.push(where.listPath);
    });
  }

  function post() {
    if (!saved.id || !postChannel) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await where.post(saved.id!, postChannel);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      setSaved(result.data);
      setNotice("Posted. Members can now open tickets from that message.");
      router.refresh();
    });
  }

  const postedChannel = structure.channels.find((c) => c.id === saved.postedChannelId);

  // Basic keeps what a ticket panel needs to work; Advanced adds the tuning. Whatever is already saved stays on screen in Basic.
  const showHelpKind = advanced || saved.helpKind !== "NONE";
  const showMessage = advanced || saved.openingMessage.trim() !== "" || saved.welcomeText.trim() !== "";
  const showHelping = advanced || saved.helperCap !== null || saved.escalationHours !== null;
  const showClosing = advanced;
  const showTuning = advanced;
  const showRouting = advanced || saved.fields.some((f) => f.options.some((o) => o.pingRoleId !== null || o.escalateRoleId !== null));
  const showFieldExtras = advanced || saved.fields.some((f) => f.placeholder !== null || f.maxLength !== null);
  const hidden = [
    !showHelpKind && "the help type (PvM and CA Help)",
    !showTuning && "the channel name and tickets per person",
    !showHelping && "helpers joining and escalation",
    !showClosing && "who can close a ticket",
    !showMessage && "the wording of the ticket message",
    !showFieldExtras && "placeholders and length limits on the questions",
    !showRouting && "who each dropdown choice pings",
  ].filter((name): name is string => typeof name === "string");

  return (
    <div className="space-y-4">
      <PanelGrid min="24rem">
        <CollapsibleCard
          id="tp-panel"
          title="The panel"
          hint="The message members see, with the button that opens a ticket."
          defaultOpen
          summary={
            <>
              <Chip tone={panel.name.trim() ? "plain" : "warn"}>{panel.name.trim() || "Needs a name"}</Chip>
              <Chip tone={panel.enabled ? "good" : "bad"}>{panel.enabled ? "Enabled" : "Disabled"}</Chip>
            </>
          }
        >
          <FieldGrid>
            <FormField label="Name" size="md" hint="For your own reference — members don't see it. Must be unique.">
              <input className={inputClass} value={panel.name} maxLength={60} onChange={(e) => set("name", e.target.value)} />
            </FormField>
            <FormField label="Title" size="md">
              <input className={inputClass} value={panel.title} maxLength={100} onChange={(e) => set("title", e.target.value)} />
            </FormField>
            <FormField label="Button label" size="md">
              <input className={inputClass} value={panel.buttonLabel} maxLength={80} onChange={(e) => set("buttonLabel", e.target.value)} />
            </FormField>
            {showHelpKind && (
              <FormField
                label="Help type"
                size="md"
                hint={
                  <>
                    PvM Help and CA Help tickets follow the {where.pvmHelpPath ? <a className="text-gold hover:underline" href={where.pvmHelpPath}>PvM Help rules</a> : "PvM Help rules"}: members ping helpers and escalate, guests ping nobody, and a
                    guest asking for Master or Grandmaster must describe earlier attempts. A CA Help panel also needs a required dropdown marked as the tier below.
                  </>
                }
              >
                <select className={inputClass} value={panel.helpKind} onChange={(e) => {
                    const helpKind = e.target.value as HelpKind;
                    // Marks only mean something on a help panel, so an ordinary panel clears them.
                    setPanel((p) => ({ ...p, helpKind, fields: helpKind === "NONE" ? p.fields.map((f) => ({ ...f, purpose: "NONE" })) : p.fields }));
                  }}>
                  {(Object.keys(HELP_KIND_LABELS) as HelpKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {HELP_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </FieldGrid>
          <FormField
            label="Description"
            size="lg"
            hint={
              <>
                Supports JonnyBot&apos;s post tags, e.g. <code>~&lt;LS&gt;~</code> for a divider and <code>~&lt;COLOR-ff9900&gt;~</code> for an accent colour.
              </>
            }
          >
            <textarea className={`${inputClass} min-h-32`} value={panel.description} maxLength={2500} onChange={(e) => set("description", e.target.value)} />
          </FormField>
          <Toggle
            checked={panel.enabled}
            onChange={(on) => set("enabled", on)}
            label="Enabled"
            detail={panel.enabled ? "Members can open tickets from the button." : "A disabled panel's button can't be used."}
          />
        </CollapsibleCard>

        <CollapsibleCard
          id="tp-channels"
          title="Ticket channels"
          hint="What happens when someone opens a ticket."
          defaultOpen
          summary={<Chip tone={panel.categoryId ? "good" : "plain"}>{panel.categoryId ? (structure.categories.find((c) => c.id === panel.categoryId)?.name ?? "A category") : "No category"}</Chip>}
        >
          <FieldGrid>
            <FormField label="Category" size="md" hint="Ticket channels are created inside this category.">
              <CategorySelect categories={structure.categories} value={panel.categoryId} onChange={(id) => set("categoryId", id)} />
            </FormField>
            {showTuning && (
              <>
                <FormField label="Channel name" size="md" hint="{number}, {user} and {type} are filled in. Example: ca-{number}">
                  <input className={inputClass} value={panel.channelNameTemplate} maxLength={60} onChange={(e) => set("channelNameTemplate", e.target.value)} />
                </FormField>
                <FormField label="Open tickets per person" size="sm" hint="Per panel.">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className={inputClass}
                    value={panel.perUserLimit}
                    onChange={(e) => set("perUserLimit", Number(e.target.value) || 1)}
                  />
                </FormField>
              </>
            )}
          </FieldGrid>
        </CollapsibleCard>

        <CollapsibleCard
          id="tp-handlers"
          title="Who handles tickets"
          hint="Helpers can see every ticket on this panel and join to help. Staff can also close any ticket and don't count against the helper limit."
          defaultOpen
          summary={
            <>
              <Chip tone={panel.staffRoleIds.length + panel.helperRoleIds.length === 0 ? "warn" : "good"}>
                {panel.staffRoleIds.length} staff, {panel.helperRoleIds.length} helper roles
              </Chip>
              {panel.helperCap !== null && <Chip>Members can join</Chip>}
              {panel.escalationHours !== null && <Chip>Escalates</Chip>}
            </>
          }
        >
          <FormField as="group" label="Helper roles" size="lg">
            <RoleMultiSelect roles={roles} value={panel.helperRoleIds} onChange={(ids) => set("helperRoleIds", ids)} />
          </FormField>
          <FormField as="group" label="Staff roles" size="lg">
            <RoleMultiSelect roles={roles} value={panel.staffRoleIds} onChange={(ids) => set("staffRoleIds", ids)} />
          </FormField>
          <FormField label="Role pinged when a ticket opens" size="md" hint="Used when the dropdown choice doesn't name its own role.">
            <RoleSelect roles={roles} value={panel.defaultPingRoleId} onChange={(id) => set("defaultPingRoleId", id)} none="Nobody" />
          </FormField>
          {showHelping && (
            <PanelGrid min="18rem" gap="gap-3">
              <SettingRow
                title="Members join as helpers"
                hint="A Join button appears; staff aren't limited."
                checked={panel.helperCap !== null}
                onChange={(on) => set("helperCap", on ? 2 : null)}
                offHint="Off: no Join button — tickets are handled by whoever is in the channel."
              >
                <FormField label="Helpers per ticket" size="sm">
                  <input
                    type="number"
                    min={1}
                    max={25}
                    className={inputClass}
                    value={panel.helperCap ?? 1}
                    onChange={(e) => set("helperCap", Number(e.target.value) || 1)}
                  />
                </FormField>
              </SettingRow>
              <SettingRow
                title="Escalate unanswered tickets"
                checked={panel.escalationHours !== null}
                onChange={(on) => set("escalationHours", on ? 24 : null)}
                offHint="Off: unanswered tickets are never re-pinged."
              >
                <FormField label="Hours without a helper" size="sm" hint="After this, the escalation role is pinged once.">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    className={inputClass}
                    value={panel.escalationHours ?? 1}
                    onChange={(e) => set("escalationHours", Number(e.target.value) || 1)}
                  />
                </FormField>
                <FormField label="Default escalation role" size="md" hint="A dropdown choice can name its own.">
                  <RoleSelect roles={roles} value={panel.defaultEscalateRoleId} onChange={(id) => set("defaultEscalateRoleId", id)} none="Nobody" />
                </FormField>
              </SettingRow>
            </PanelGrid>
          )}
        </CollapsibleCard>

        {showClosing && (
          <CollapsibleCard
            id="tp-closing"
            title="Who can close a ticket"
            hint="The Close button sits at the bottom of every ticket. Staff roles and admins can always use it."
            summary={
              <Chip>
                {[panel.closeByRequester && "The member", panel.closeByHelpers && "Helpers", panel.closeRoleIds.length > 0 && `${panel.closeRoleIds.length} role${panel.closeRoleIds.length === 1 ? "" : "s"}`].filter(Boolean).join(", ") || "Staff only"}
              </Chip>
            }
          >
            <ClosingFields
              value={{ closeByRequester: panel.closeByRequester, closeByHelpers: panel.closeByHelpers, closeRoleIds: panel.closeRoleIds }}
              onChange={(change) => setPanel((p) => ({ ...p, ...change }))}
              roles={roles}
            />
          </CollapsibleCard>
        )}

        {showMessage && (
          <CollapsibleCard
            id="tp-message"
            title="The ticket message"
            hint="What a member sees at the top of the private channel their ticket opens in. Laid out like Ticket Tool's."
            summary={<Chip>{panel.openingMessage.trim() || panel.welcomeText.trim() ? "Own wording" : "Standard wording"}</Chip>}
          >
            <MessageFields
              value={{ openingMessage: panel.openingMessage, welcomeText: panel.welcomeText }}
              onChange={(change) => setPanel((p) => ({ ...p, ...change }))}
              panelTitle={panel.title}
              questions={panel.fields.map((f) => f.label)}
              pingsRole={panel.defaultPingRoleId !== null || panel.fields.some((f) => f.options.some((o) => o.pingRoleId !== null))}
              usesHelpers={panel.helperCap !== null}
            />
          </CollapsibleCard>
        )}

        <Span>
          <CollapsibleCard
            id="tp-form"
            title="The form"
            hint={`Questions asked when someone opens a ticket (up to ${MAX_FIELDS}). Their answers are shown in the ticket.`}
            defaultOpen
            summary={<Chip tone={panel.fields.length === 0 ? "plain" : "good"}>{panel.fields.length === 0 ? "No questions" : `${panel.fields.length} question${panel.fields.length === 1 ? "" : "s"}`}</Chip>}
          >
            {panel.fields.length === 0 && <p className="text-sm text-muted">No questions — the ticket opens straight away.</p>}

            <PanelGrid min="22rem" gap="gap-3">
              {panel.fields.map((field, index) => (
                <div key={field.uid} className="space-y-3 rounded-md border border-surface-border bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">Question {index + 1}</span>
                    <div className="flex gap-1.5">
                      <button type="button" className={ghostButton} disabled={index === 0} onClick={() => moveField(index, -1)} aria-label="Move up">
                        ↑
                      </button>
                      <button
                        type="button"
                        className={ghostButton}
                        disabled={index === panel.fields.length - 1}
                        onClick={() => moveField(index, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={dangerButton}
                        onClick={() => setPanel((p) => ({ ...p, fields: p.fields.filter((f) => f.uid !== field.uid) }))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <FormField label="Question" size="md">
                    <input className={inputClass} value={field.label} maxLength={45} onChange={(e) => setField(field.uid, { label: e.target.value })} />
                  </FormField>
                  <FormField label="Answer type" size="md">
                    <select
                      className={inputClass}
                      value={field.kind}
                      onChange={(e) => setField(field.uid, { kind: e.target.value as FieldKind, purpose: "NONE" })}
                    >
                      {(Object.keys(KIND_LABELS) as FieldKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {KIND_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <Toggle checked={field.required} onChange={(on) => setField(field.uid, { required: on })} label="Required" />
                  {showFieldExtras && (field.kind === "SHORT" || field.kind === "PARAGRAPH") && (
                    <FieldGrid>
                      <FormField label="Placeholder" size="md">
                        <input
                          className={inputClass}
                          value={field.placeholder ?? ""}
                          maxLength={100}
                          onChange={(e) => setField(field.uid, { placeholder: e.target.value || null })}
                        />
                      </FormField>
                      <FormField label="Max length" size="sm">
                        <input
                          type="number"
                          min={1}
                          max={4000}
                          className={inputClass}
                          value={field.maxLength ?? ""}
                          onChange={(e) => setField(field.uid, { maxLength: e.target.value ? Number(e.target.value) : null })}
                        />
                      </FormField>
                    </FieldGrid>
                  )}

                  {panel.helpKind !== "NONE" && (
                    <FormField
                      label="Part in the help rules"
                      size="md"
                      hint="A panel with a boss question is asked for step by step in Discord: members pick the boss, the tier and an optional achievement from lists, then answer the other questions in a small form. The boss, tier and achievement questions only say where those answers are filed."
                    >
                      <select className={inputClass} value={field.purpose} onChange={(e) => setField(field.uid, { purpose: e.target.value as FieldPurpose })}>
                        <option value="NONE">{PURPOSE_LABELS.NONE}</option>
                        {purposesFor(field.kind).map((purpose) => (
                          <option key={purpose} value={purpose}>
                            {PURPOSE_LABELS[purpose]}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}

                  {field.kind === "SELECT" && (
                    <div className="space-y-2 border-t border-surface-border pt-3">
                      <p className="text-sm font-medium">Choices</p>
                      {showRouting && (
                        <p className="text-xs text-muted">
                          Each choice can ping its own role when the ticket opens and name who to escalate to — that&apos;s how one panel can route to different helpers.
                        </p>
                      )}
                      {field.options.map((option) => (
                        <div key={option.uid} className="flex flex-wrap items-start gap-2">
                          <div className="w-full max-w-64 min-w-40 flex-1">
                            <input
                              className={inputClass}
                              placeholder="Choice label"
                              value={option.label}
                              maxLength={100}
                              onChange={(e) => setOption(field.uid, option.uid, { label: e.target.value })}
                              aria-label="Choice label"
                            />
                          </div>
                          {showRouting && (
                            <>
                              <div className="w-full max-w-56 min-w-40 flex-1">
                                <RoleSelect
                                  roles={roles}
                                  value={option.pingRoleId}
                                  onChange={(id) => setOption(field.uid, option.uid, { pingRoleId: id })}
                                  none="Ping: panel default"
                                  label="Role to ping for this option"
                                />
                              </div>
                              <div className="w-full max-w-56 min-w-40 flex-1">
                                <RoleSelect
                                  roles={roles}
                                  value={option.escalateRoleId}
                                  onChange={(id) => setOption(field.uid, option.uid, { escalateRoleId: id })}
                                  none="Escalate to: panel default"
                                  label="Role to escalate to for this option"
                                />
                              </div>
                            </>
                          )}
                          <button
                            type="button"
                            className={dangerButton}
                            onClick={() => setField(field.uid, { options: field.options.filter((o) => o.uid !== option.uid) })}
                            aria-label="Remove choice"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={ghostButton}
                        disabled={field.options.length >= MAX_OPTIONS}
                        onClick={() =>
                          setField(field.uid, { options: [...field.options, { uid: nextUid(), label: "", pingRoleId: null, escalateRoleId: null }] })
                        }
                      >
                        + Add choice
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </PanelGrid>

            <button type="button" className={ghostButton} disabled={panel.fields.length >= MAX_FIELDS} onClick={addField}>
              + Add question
            </button>
          </CollapsibleCard>
        </Span>

        {!isNew && (
          <CollapsibleCard
            id="tp-post"
            title="Post the panel"
            hint={
              saved.postedChannelId ? (
                <>Currently posted in {postedChannel ? `#${postedChannel.name}` : "a channel"}. Posting to the same channel updates that message in place.</>
              ) : (
                "Not posted yet. Save your changes first — the posted message shows the saved version."
              )
            }
            defaultOpen
            summary={<Chip tone={saved.postedChannelId ? "good" : "plain"}>{saved.postedChannelId ? `Posted in #${postedChannel?.name ?? "a channel"}` : "Not posted"}</Chip>}
          >
            <FormField label="Channel" size="md" as="group">
              <ChannelSelect {...choicesOf(structure)} value={postChannel} onChange={setPostChannel} none="Choose a channel…" onlyPostable />
            </FormField>
            <button type="button" className={primaryButton} disabled={pending || !postChannel} onClick={post}>
              {saved.postedChannelId && saved.postedChannelId === postChannel ? "Update posted panel" : "Post panel"}
            </button>
          </CollapsibleCard>
        )}
      </PanelGrid>

      {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}

      {error && <Notice tone="error" title={error.message} items={error.problems} />}
      {notice && <Notice tone="success" title={notice} />}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={pending} onClick={save}>
          {pending ? "Working…" : isNew ? "Create panel" : "Save changes"}
        </button>
        {!isNew && (
          <button type="button" className={dangerButton} disabled={pending} onClick={remove}>
            Delete panel
          </button>
        )}
      </div>
    </div>
  );
}
